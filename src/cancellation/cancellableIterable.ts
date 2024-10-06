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
/**
 * Creates an async generator that wraps an async iterable and provides cancellation support.
 *
 * @template T - The type of elements in the async iterable.
 * @param {AsyncIterableInput<T>} iterable - The async iterable to wrap.
 * @param {CancellationToken} [cancellationToken] - The cancellation token to be used.
 * @returns {AsyncGenerator<T>} - The cancellable async generator.
 */
// deno-fmt-ignore
export function cancellableIterable<T>(iterable: AsyncIterableInput<T>, cancellationToken?: CancellationToken): AsyncGenerator<T>;

/**
 * Creates an async generator that wraps an async iterable and provides cancellation support.
 *
 * @template T - The type of elements in the async iterable.
 * @param {AsyncIterableInput<T>} iterable - The async iterable to wrap.
 * @param {(error: CancellationError) => void} [onCancel] - The callback to be called when the iterable is cancelled.
 * @returns {AsyncGenerator<T>} - The cancellable async generator.
 */
// deno-fmt-ignore
export function cancellableIterable<T>(iterable: AsyncIterableInput<T>, onCancel: (error: CancellationError) => void): AsyncGenerator<T>;

/**
 * Creates an async generator that wraps an async iterable and provides cancellation support.
 *
 * @template T - The type of elements in the async iterable.
 * @param {AsyncIterableInput<T>} iterable - The async iterable to wrap.
 * @param {boolean} [throwOnCancellation] - A value indicating whether to throw an error when the iterable is cancelled.
 * @returns {AsyncGenerator<T>} - The cancellable async generator.
 */
// deno-fmt-ignore
export function cancellableIterable<T>(iterable: AsyncIterableInput<T>, throwOnCancellation: boolean): AsyncGenerator<T>;

/**
 * Creates an async generator that wraps an async iterable and provides cancellation support.
 *
 * @template T - The type of elements in the async iterable.
 * @param {AsyncIterableInput<T>} iterable - The async iterable to wrap.
 * @param {CancellationIterableOptions} [options] - The options for the cancellable iterable.
 * @returns {AsyncGenerator<T>} - The cancellable async generator.
 */
// deno-fmt-ignore
export function cancellableIterable<T>(iterable: AsyncIterableInput<T>, options?: CancellationIterableOptions): AsyncGenerator<T>; // deno-fmt-ignore

/**
 * Creates an async generator that wraps an async iterable and provides cancellation support.
 *
 * @template T - The type of elements in the async iterable.
 * @param {AsyncIterableInput<T>} iterable - The async iterable to wrap.
 * @param {CancellationIterableOptionsExtended} [options] - The options for the cancellable iterable.
 * @returns {AsyncGenerator<T>} - The cancellable async generator.
 */
export async function* cancellableIterable<T>(
  iterable: AsyncIterableInput<T>,
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

  const unregister = onCancel && token ?
    token.register(t => onCancel(t.reason as CancellationError)) :
    () => { };

  try {
    const it = Promises.cancellableIterable(iterable, token);
    yield* it[Symbol.asyncIterator]();
  } catch (e) {
    reportCancellation(e);
  } finally {
    unregister();
  }
}
