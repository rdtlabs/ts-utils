import { CancellationError } from "./CancellationError.ts";
import type { CancellationToken } from "./CancellationToken.ts";
import { Promises } from "../async/Promises.ts";
import {
  CancellationOptions,
  type CancellationOptionsExtended,
} from "./CancellationOptions.ts";

// overload declarations
// deno-fmt-ignore
export function cancellablePromise<T>(promise: Promise<T>, cancellationToken?: CancellationToken): Promise<T>; // deno-fmt-ignore
export function cancellablePromise<T>(promise: Promise<T>, defaultValueOnCancel: () => T): Promise<T>; // deno-fmt-ignore
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
