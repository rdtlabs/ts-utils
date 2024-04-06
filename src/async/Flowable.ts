import { fromIterableLike, IterableLike } from "./fromIterableLike.ts";
import { ErrorLike } from "../types.ts";
import { Cancellable } from "../cancellation/Cancellable.ts";
import { type CancellationToken } from "../cancellation/CancellationToken.ts";
import { EventOptions } from "./fromEvent.ts";
import { fromEvent } from "./fromEvent.ts";
import { fromObservable } from "./fromObservable.ts";
import { Observable } from "./_rx.types.ts";
import { BufferStrategyOptions } from "../buffer/BufferLike.ts";

export function flowable<T>(it: IterableLike<T>): Flowable<T> {
  return Flowable.of(it);
}

export class Flowable<T> implements Flowable<T> {
  #generator: () => AsyncGenerator;

  private constructor(
    generator: () => AsyncGenerator,
    onError?: (e: ErrorLike) => Promise<boolean> | boolean,
  ) {
    if (onError) {
      this.#generator = () => {
        const it = generator();
        return {
          [Symbol.asyncIterator]() {
            return this;
          },
          // deno-lint-ignore no-explicit-any
          return(value: any): Promise<IteratorResult<unknown, any>> {
            return Promise.resolve({ done: true, value });
          },
          // deno-lint-ignore no-explicit-any
          throw(e: any): Promise<IteratorResult<unknown, any>> {
            return Promise.reject(e);
          },
          async next() {
            while (true) {
              try {
                return await it.next();
              } catch (error) {
                if (!await onError(error)) {
                  throw error;
                }
              }
            }
          },
        };
      };
    } else {
      this.#generator = generator;
    }
  }

  toIterable(): AsyncIterable<T> {
    const generator = this.#generator;
    return {
      [Symbol.asyncIterator]() {
        return generator() as AsyncGenerator<T>;
      },
    };
  }

  toArray(cancellationToken?: CancellationToken): Promise<T[]> {
    return new Promise<T[]>((resolve, reject) => {
      const items: T[] = [];
      (async () => {
        try {
          for await (
            const item of Cancellable.iterable(
              this.toIterable(),
              cancellationToken,
            )
          ) {
            items.push(item);
          }
          if (cancellationToken?.isCancelled) {
            reject(cancellationToken.reason);
          } else {
            resolve(items);
          }
        } catch (error) {
          reject(error);
        }
      })();
    });
  }

  forEach(cb: (item: T) => void): Promise<void> {
    const generator = this.#generator;
    return new Promise<void>((resolve, reject) => {
      (async () => {
        try {
          for await (const item of generator()) {
            cb(item as T);
          }
          resolve();
        } catch (error) {
          reject(error);
        }
      })();
    });
  }

  filter(
    predicate: (t: T) => Promise<boolean> | boolean,
  ): Flowable<T> {
    const generator = this.#generator;
    return new Flowable<T>(async function* () {
      for await (const item of generator()) {
        if (await predicate(item as T)) {
          yield await item;
        }
      }
    });
  }

  map<R>(
    mapper: (t: T, index: number) => Promise<R> | R,
  ): Flowable<R> {
    const generator = this.#generator;
    return new Flowable<R>(async function* inner() {
      let index = 0;
      for await (const item of generator()) {
        yield await mapper(item as T, index++);
      }
    });
  }

  peek(cb: (item: T) => void): Flowable<T> {
    const generator = this.#generator;
    return new Flowable<T>(async function* () {
      for await (const item of generator()) {
        cb(item as T);
        yield item;
      }
    });
  }

  skipUntil(predicate: (t: T) => Promise<boolean> | boolean): Flowable<T> {
    const generator = this.#generator;
    return new Flowable<T>(async function* () {
      let skipping = true;
      for await (const item of generator()) {
        if (skipping) {
          if (!(await predicate(item as T))) {
            continue;
          }
          skipping = false;
        }
        yield item;
      }
    });
  }

  takeWhile(predicate: (t: T) => Promise<boolean> | boolean): Flowable<T> {
    const generator = this.#generator;
    return new Flowable<T>(async function* () {
      for await (const item of generator()) {
        if (!(await predicate(item as T))) {
          break;
        }
        yield item;
      }
    });
  }

  resumeOnError(
    onError?: (error: ErrorLike) => Promise<boolean> | boolean,
  ): Flowable<T> {
    return new Flowable<T>(this.#generator, onError ?? (() => true));
  }

  concat(...sources: Flowable<T>[]): Flowable<T> {
    const generator = this.#generator;
    return new Flowable<T>(async function* () {
      yield* generator();
      for (const source of sources) {
        yield* source.#generator();
      }
    });
  }

  static of<T>(it: IterableLike<T>): Flowable<T> {
    return new Flowable<T>(async function* inner() {
      for await (const item of fromIterableLike(it)) {
        yield item;
      }
    });
  }

  static fromEvent<T extends Event>(
    type: string,
    options?: EventOptions<T>,
  ): Flowable<T>;

  static fromEvent<K extends keyof WindowEventMap>(
    type: K,
    options?: EventOptions<WindowEventMap[K]>,
  ): Flowable<WindowEventMap[K]>;

  static fromEvent<T extends Event>(
    // deno-lint-ignore no-explicit-any
    ...args: any[]
  ): Flowable<T> {
    return Flowable.of(fromEvent(args[0], args[1]));
  }

  static from<T>(
    observable: Observable<T>,
    options?: {
      bufferStrategy?: BufferStrategyOptions<T>;
      bufferSize?: number;
      cancellationToken?: CancellationToken;
    },
  ): Flowable<T> {
    return Flowable.of(fromObservable(observable, options));
  }
}
