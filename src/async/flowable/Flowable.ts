import { type BufferStrategyOptions } from "../../buffer/BufferLike.ts";
import { type CancellationToken } from "../../cancellation/CancellationToken.ts";
import { type Observable } from "../_rx.types.ts";
import { type EventOptions, fromEvent } from "../fromEvent.ts";
import { fromIterableLike, type IterableLike } from "../fromIterableLike.ts";
import { fromObservable } from "../fromObservable.ts";
import { type ErrorLike } from "../../types.ts";
import { type Connectable } from "./Connectable.ts";
import { __createConnectable, __createFlowable } from "./__utils.ts";

export interface Flowable<T> {
  filter(
    predicate: (t: T) => Promise<boolean> | boolean,
  ): Flowable<T>;

  map<R>(
    mapper: (t: T, index: number) => Promise<R> | R,
  ): Flowable<R>;

  compose<R>(
    mapper: (t: T, index: number) => AsyncIterable<R>,
  ): Flowable<R>;

  peek(cb: (item: T) => void): Flowable<T>;

  skipUntil(
    predicate: (t: T) => Promise<boolean> | boolean,
  ): Flowable<T>;

  takeWhile(
    predicate: (t: T) => Promise<boolean> | boolean,
  ): Flowable<T>;

  resumeOnError(
    onError?: (error: ErrorLike) => Promise<boolean> | boolean,
  ): Flowable<T>;

  buffer(size: number): Flowable<T[]>;

  onError(cb: (error: ErrorLike) => void): Flowable<T>;
  onComplete(cb: () => void): Flowable<T>;
  onTerminate(cb: () => void): Flowable<T>;

  into<R>(connectable: Connectable<T, R>): Flowable<R>;

  toObservable(): Observable<T>;
  toIterable(cancellationToken?: CancellationToken): AsyncIterable<T>;
  toArray(cancellationToken?: CancellationToken): Promise<T[]>;
  forEach(
    cb: (item: T) => void,
    cancellationToken?: CancellationToken,
  ): Promise<void>;
}

export const Flowable = Object.freeze({
  of<T>(
    // deno-lint-ignore no-explicit-any
    ...args: any[]
  ): unknown {
    if (args.length === 0) {
      return __createConnectable<T>();
    }

    if (args.length > 1) {
      throw new Error("Invalid number of arguments");
    }

    const it = args[0];
    if (!it || typeof it !== "object") {
      throw new Error("Invalid iterable like input type");
    }

    return __createFlowable<T>(async function* () {
      for await (const item of fromIterableLike<T>(it)) {
        yield item;
      }
    });
  },
  fromEvent<T extends Event>(
    // deno-lint-ignore no-explicit-any
    ...args: any[]
  ): Flowable<T> {
    return Flowable.of(fromEvent(args[0], args[1]));
  },
  fromGenerator<T>(
    generator: () => AsyncGenerator<T>,
  ): Flowable<T> {
    return __createFlowable(generator);
  },
  from<T>(
    observable: Observable<T>,
    options?: {
      bufferStrategy?: BufferStrategyOptions<T>;
      bufferSize?: number;
      cancellationToken?: CancellationToken;
    },
  ): Flowable<T> {
    return Flowable.of(fromObservable(observable, options));
  },
  concat<T>(...sources: Flowable<T>[]): Flowable<T> {
    const copy = sources.slice();
    return __createFlowable(async function* inner() {
      for (const item of copy) {
        for await (const innerItem of item.toIterable()) {
          yield innerItem;
        }
      }
    });
  },
}) as {
  of<T>(): Connectable<T, T>;
  of<T>(it: IterableLike<T>): Flowable<T>;
  fromEvent<T extends Event>(
    type: string,
    options?: EventOptions<T>,
  ): Flowable<T>;
  fromEvent<K extends keyof WindowEventMap>(
    type: K,
    options?: EventOptions<WindowEventMap[K]>,
  ): Flowable<WindowEventMap[K]>;
  fromGenerator<T>(
    generator: () => AsyncGenerator<T>,
  ): Flowable<T>;
  from<T>(
    observable: Observable<T>,
    options?: {
      bufferStrategy?: BufferStrategyOptions<T>;
      bufferSize?: number;
      cancellationToken?: CancellationToken;
    },
  ): Flowable<T>;
  concat<T>(...sources: Flowable<T>[]): Flowable<T>;
};
