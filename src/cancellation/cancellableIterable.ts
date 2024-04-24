import { CancellationError } from "./CancellationError.ts";
import { type CancellationToken } from "./CancellationToken.ts";
import { Promises } from "../async/Promises.ts";
import { ErrorLike } from "../types.ts";
import { CancellationOptions, CancellationOptionsExtended } from "./CancellationOptions.ts";

// overload declarations
// deno-fmt-ignore
export function cancellableIterable<T>(iterable: AsyncGenerator<T> | AsyncIterable<T>, cancellationToken?: CancellationToken): AsyncGenerator<T>; // deno-fmt-ignore
export function cancellableIterable<T>(iterable: AsyncGenerator<T> | AsyncIterable<T>, onCancel: (error: CancellationError) => void): AsyncGenerator<T>; // deno-fmt-ignore
export function cancellableIterable<T>(iterable: AsyncGenerator<T> | AsyncIterable<T>, throwOnCancellation: boolean): AsyncGenerator<T>; // deno-fmt-ignore
export function cancellableIterable<T>(iterable: AsyncGenerator<T> | AsyncIterable<T>, options?: CancellationOptions): AsyncGenerator<T>; // deno-fmt-ignore

export async function* cancellableIterable<T>(
  iterator: AsyncGenerator<T> | AsyncIterable<T>,
  options?: CancellationOptionsExtended,
): AsyncGenerator<T> {

  const { token, onCancel, throwOnCancellation } = CancellationOptions.from(options);
  const reportCancellation = (e: ErrorLike) => {
    if (
      throwOnCancellation ||
      !(e instanceof CancellationError) ||
      (token !== undefined && e.token !== token)) {
      throw e;
    }
  };

  const unregister = onCancel && token ? token.register(t => onCancel(t.reason)) : () => { };
  try {
    const it = Promises.cancellable(iterator, token)[Symbol.asyncIterator]();
    yield* it;
  } catch (e) {
    reportCancellation(e);
  } finally {
    unregister();
  }
}
