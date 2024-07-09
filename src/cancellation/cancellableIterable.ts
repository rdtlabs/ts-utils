import { CancellationError } from "./CancellationError.ts";
import type { CancellationToken } from "./CancellationToken.ts";
import { Promises } from "../async/Promises.ts";
import type { ErrorLike } from "../types.ts";
import {
  CancellationIterableOptions,
  type CancellationIterableOptionsExtended,
} from "./CancellationIterableOptions.ts";

type AsyncIterableInput<T> = AsyncGenerator<T> | AsyncIterable<T>;

// overload declarations
// deno-fmt-ignore
export function cancellableIterable<T>(iterable: AsyncIterableInput<T>, cancellationToken?: CancellationToken): AsyncGenerator<T>; // deno-fmt-ignore
export function cancellableIterable<T>(iterable: AsyncIterableInput<T>, onCancel: (error: CancellationError) => void): AsyncGenerator<T>; // deno-fmt-ignore
export function cancellableIterable<T>(iterable: AsyncIterableInput<T>, throwOnCancellation: boolean): AsyncGenerator<T>; // deno-fmt-ignore
export function cancellableIterable<T>(iterable: AsyncIterableInput<T>, options?: CancellationIterableOptions): AsyncGenerator<T>; // deno-fmt-ignore

export async function* cancellableIterable<T>(
  iterator: AsyncIterableInput<T>,
  options?: CancellationIterableOptionsExtended,
): AsyncGenerator<T> {

  const { token, onCancel, throwOnCancellation } = CancellationIterableOptions.from(options);
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
    const it = Promises.cancellableIterable(iterator, token);
    yield* it[Symbol.asyncIterator]();
  } catch (e) {
    reportCancellation(e);
  } finally {
    unregister();
  }
}
