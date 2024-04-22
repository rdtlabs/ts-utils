import { CancellationError } from "./CancellationError.ts";
import {
  fromIterableLike,
  type IterableLike,
} from "../async/fromIterableLike.ts";
import { type CancellationToken } from "./CancellationToken.ts";
import { CancellablePromise } from "./CancellablePromise.ts";

export type CancellationOptions =
  | ((error: CancellationError) => void)
  | boolean
  | CancellationToken
  | {
    token?: CancellationToken;
    onCancel?: (error: CancellationError) => void;
    throwOnCancellation?: boolean;
  };

// overload declarations
// deno-fmt-ignore
export function cancellableIterable<T>(iterable: readonly T[], options?: CancellationOptions): AsyncIterable<T>; // deno-fmt-ignore
export function cancellableIterable<T>(iterable: readonly PromiseLike<T>[], options?: CancellationOptions): AsyncIterable<T>; // deno-fmt-ignore
export function cancellableIterable<T>(iterable: Iterable<T>, options?: CancellationOptions): AsyncIterable<T>; // deno-fmt-ignore
export function cancellableIterable<T>(iterable: Iterable<PromiseLike<T>>, options?: CancellationOptions): AsyncIterable<T>; // deno-fmt-ignore
export function cancellableIterable<T>(iterable: AsyncIterable<T>, options?: CancellationOptions): AsyncIterable<T>; // deno-fmt-ignore
export function cancellableIterable<T>(iterable: PromiseLike<readonly T[]>, options?: CancellationOptions): AsyncIterable<T>; // deno-fmt-ignore
export function cancellableIterable<T>(iterable: PromiseLike<readonly PromiseLike<T>[]>, options?: CancellationOptions): AsyncIterable<T>; // deno-fmt-ignore
export function cancellableIterable<T>(iterable: PromiseLike<Iterable<T>>, options?: CancellationOptions): AsyncIterable<T>; // deno-fmt-ignore
export function cancellableIterable<T>(iterable: PromiseLike<Iterable<PromiseLike<T>>>, options?: CancellationOptions): AsyncIterable<T>; // deno-fmt-ignore
export function cancellableIterable<T>(iterable: PromiseLike<AsyncIterable<T>>, options?: CancellationOptions): AsyncIterable<T>; // deno-fmt-ignore
export function cancellableIterable<T>(iterable: IterableLike<T>, options?: CancellationOptions): AsyncIterable<T>;

export function cancellableIterable<T>(
  iterable: IterableLike<T>,
  options?: CancellationOptions,
): AsyncIterable<T> {
  const { token, onCancel, throwOnCancellation } = getOptions(options);
  if (token?.isCancelled === true) {
    if (onCancel) {
      queueMicrotask(() => onCancel(token.reason));
    }
    return {
      [Symbol.asyncIterator]: () => ({
        next: () => {
          return Promise.reject(new CancellationError(token));
        },
      }),
    };
  }

  const it = fromIterableLike(iterable);
  if (!token || token.state === "none") {
    return it;
  }

  return {
    [Symbol.asyncIterator]: () => {
      const promise = new CancellablePromise<never>(() => {}, {
        token,
        onCancel: (r) => {
          unregister();
          if (onCancel) {
            onCancel(r);
          }
        },
      });
      const unregister = token.register((r) => promise.cancel(r));
      const iterator = it[Symbol.asyncIterator]();
      return {
        next: () => {
          try {
            return Promise.race([promise, iterator.next()]).then((value) => {
              if (value.done) {
                unregister();
              }
              return value;
            }).catch((e) => {
              unregister();
              if (throwOnCancellation || !(e instanceof CancellationError)) {
                throw e;
              }
              return {
                done: true,
                value: undefined,
              };
            });
          } catch (e) {
            unregister();
            if (throwOnCancellation || !(e instanceof CancellationError)) {
              return Promise.reject(e);
            }
            // deno-lint-ignore no-explicit-any
            return Promise.resolve<any>({
              done: true,
              value: undefined,
            });
          }
        },
      };
    },
  };
}

function getOptions(options?: CancellationOptions): {
  token?: CancellationToken;
  onCancel?: (error: CancellationError) => void;
  throwOnCancellation?: boolean;
} {
  if (!options) {
    return { throwOnCancellation: false };
  }

  if (typeof options === "boolean") {
    return { throwOnCancellation: options === true };
  }

  if (typeof options === "function") {
    return { onCancel: options, throwOnCancellation: false };
  }

  if ("throwIfCancelled" in options) {
    return { token: options, throwOnCancellation: false };
  }

  return {
    token: options.token,
    onCancel: options.onCancel,
    throwOnCancellation: options.throwOnCancellation === true,
  };
}
