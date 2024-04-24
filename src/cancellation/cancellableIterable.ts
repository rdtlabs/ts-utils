import { CancellationError } from "./CancellationError.ts";
import { type CancellationToken } from "./CancellationToken.ts";
import { Promises } from "../async/Promises.ts";
import { ErrorLike } from "../types.ts";
import {
  CancellationOptions,
  CancellationOptionsExtended,
} from "./CancellationOptions.ts";

type AsyncIterableInput<T> = AsyncGenerator<T> | AsyncIterable<T>;

// overload declarations
// deno-fmt-ignore
export function cancellableIterable<T>(iterable: AsyncIterableInput<T>, cancellationToken?: CancellationToken): AsyncGenerator<T>; // deno-fmt-ignore
export function cancellableIterable<T>(iterable: AsyncIterableInput<T>, onCancel: (error: CancellationError) => void): AsyncGenerator<T>; // deno-fmt-ignore
export function cancellableIterable<T>(iterable: AsyncIterableInput<T>, throwOnCancellation: boolean): AsyncGenerator<T>; // deno-fmt-ignore
export function cancellableIterable<T>(iterable: AsyncIterableInput<T>, options?: CancellationOptions): AsyncGenerator<T>; // deno-fmt-ignore

export async function* cancellableIterable<T>(
  iterator: AsyncIterableInput<T>,
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
    const it = Promises.cancellable(iterator, token);
    yield* it[Symbol.asyncIterator]();
  } catch (e) {
    reportCancellation(e);
  } finally {
    unregister();
  }
}
