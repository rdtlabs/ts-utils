import { CancellationError } from "./CancellationError.ts";
import type { CancellationToken } from "./CancellationToken.ts";
import { Promises } from "../async/Promises.ts";
import {
  CancellationOptions,
  type CancellationOptionsExtended,
} from "./CancellationOptions.ts";

// overload declarations
/**
 * Wraps a promise with cancellation support.
 *
 * @param promise - The promise to be wrapped.
 * @param cancellationToken - The cancellation token to be used.
 * @returns A promise that can be cancelled.
 */
// deno-fmt-ignore
export function cancellablePromise<T>(promise: Promise<T>, cancellationToken?: CancellationToken): Promise<T>;

/**
 * Wraps a promise with cancellation support.
 *
 * @param promise - The promise to be wrapped.
 * @param defaultValueOnCancel - The default value to be returned when the promise is cancelled.
 * @returns A promise that can be cancelled.
 */
// deno-fmt-ignore
export function cancellablePromise<T>(promise: Promise<T>, defaultValueOnCancel: () => T): Promise<T>;

/**
 * Wraps a promise with cancellation support.
 *
 * @param promise - The promise to be wrapped.
 * @param options - The cancellation options.
 * @returns A promise that can be cancelled.
 */
// deno-fmt-ignore
export function cancellablePromise<T>(promise: Promise<T>, options?: CancellationOptions): Promise<T>; // deno-fmt-ignore

export async function cancellablePromise<T>(
  p: Promise<T>,
  options?: CancellationOptionsExtended<T>,
): Promise<T> {

  const { token, onCancel, defaultValueOnCancel } = CancellationOptions.from(options);

  try {
    return await Promises.cancellable<T>(p, token);
  } catch (e) {
    if (e instanceof CancellationError) {
      if (onCancel) {
        queueMicrotask(() => onCancel(e));
      }

      if (defaultValueOnCancel) {
        return defaultValueOnCancel();
      }
    }

    throw e;
  }
}
