import type { BufferStrategyOptions } from "../buffer/BufferLike.ts";
import type { ErrorLike } from "../types.ts";
import type { CancellationToken } from "../cancellation/CancellationToken.ts";
import type { Observable } from "./_rx.types.ts";
import { Done } from "../done.ts";
import { cancellableIterable } from "../cancellation/cancellableIterable.ts";
import { asyncQueue } from "./queue/asyncQueue.ts";
import { Promises } from "./Promises.ts";

/**
 * Converts an Observable into an AsyncIterable.
 *
 * @template T - The type of values emitted by the Observable.
 * @param {Observable<T>} observable - The Observable to convert.
 * @param {Object} [options] - Optional configuration options.
 * @param {BufferStrategyOptions<T>} [options.bufferStrategy] - The buffer strategy options.
 * @param {number} [options.bufferSize] - The buffer size.
 * @param {CancellationToken} [options.cancellationToken] - The cancellation token.
 * @returns {AsyncIterable<T> & Disposable} - The converted AsyncIterable.
 */
export function fromObservable<T>(
  observable: Observable<T>,
  options?: {
    bufferStrategy?: BufferStrategyOptions<T>;
    bufferSize?: number;
    cancellationToken?: CancellationToken;
  },
): AsyncIterable<T> & Disposable {
  // deno-lint-ignore no-explicit-any
  if (!options && (observable as any)[Symbol.asyncIterator]) {
    return {
      [Symbol.dispose]: () => dispose(Done),
      [Symbol.asyncIterator]: () => {
        // deno-lint-ignore no-explicit-any
        return (observable as any)[Symbol.asyncIterator]();
      },
    };
  }

  const disposables = new Array<() => void>();
  const buffer = asyncQueue<T>({
    bufferSize: options?.bufferSize ?? Infinity,
    bufferStrategy: options?.bufferStrategy,
  });

  disposables.push(() => buffer[Symbol.dispose]());

  // deno-lint-ignore no-explicit-any
  let returnValue: any;
  let thrownError: ErrorLike | undefined;

  const isDone = () => returnValue || thrownError;

  // deno-lint-ignore no-explicit-any
  const dispose = (v?: any, e?: ErrorLike) => {
    if (isDone()) {
      return;
    }

    thrownError = e;
    if (!thrownError) {
      returnValue = {
        done: true,
        value: v,
      };
    }

    for (let i = disposables.length - 1; i >= 0; i--) {
      try {
        disposables[i]();
      } catch {
        // no-op
      }
    }

    disposables.length = 0;

    buffer.close();
  };

  const subscriber = {
    next: (value: T) => {
      if (isDone()) {
        return;
      }
      try {
        buffer.enqueue(value);
      } catch (e) {
        subscriber.error(e);
      }
    },
    error: (e: unknown) => {
      dispose(undefined, (e as ErrorLike) ?? new Error("Observable error"));
    },
    complete: () => {
      dispose();
    },
  };

  disposables.push(observable.subscribe(subscriber));

  const cancellable = cancellableIterable(
    buffer,
    options?.cancellationToken,
  );

  return Object.seal({
    [Symbol.dispose]: () => dispose(Done),
    [Symbol.asyncIterator]: () => {
      const it = cancellable[Symbol.asyncIterator]();
      return {
        next: async () => {
          if (isDone()) {
            if (thrownError) {
              throw thrownError;
            }
            return returnValue;
          }

          try {
            const tpl = await it.next();
            if (tpl.done) {
              dispose(tpl.value);
              return returnValue;
            }

            return tpl;
          } catch (e) {
            dispose(e);
            throw e;
          }
        },
        throw: (e) => {
          dispose(e);
          return Promises.reject(e);
        },
        // deno-lint-ignore no-explicit-any
        return: (value: any) => {
          if (returnValue !== undefined) {
            return Promise.resolve(returnValue);
          }

          dispose(value);

          return Promise.resolve(returnValue);
        },
      };
    },
  });
}
