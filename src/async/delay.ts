/**
 * Delays the execution of a function by a specified amount of time.
 *
 * @param ms - The number of milliseconds to delay the execution.
 * @param cancellationToken - An optional CancellationToken that can be used to cancel the delay.
 * @returns A disposable Promise that resolves after the specified delay.
 * @throws {DisposedError} If the delay is disposed before it completes.
 */
import { DisposedError } from "../DisposedError.ts";
import type { CancellationToken } from "../cancellation/CancellationToken.ts";
import { Errors } from "../errors/errors.ts";
import { TimeoutInput } from "../types.ts";

/**
 * Creates a promise that will complete after the specified delay.
 * @param ms The number of milliseconds to delay the promise.
 * @param cancellationToken An optional cancellation token that can be used to cancel the delay.
 * @returns A promise that will resolve after the specified delay.
 */
export function delay(
  ms: TimeoutInput,
  cancellationToken?: CancellationToken,
): Promise<void> & Disposable {
  const millis = TimeoutInput.deriveTimeout(ms);
  let rej!: (reason: unknown) => void;
  let id!: number;
  let unregister: (() => void) | undefined;
  const promise = new Promise((resolve, reject) => {
    rej = reject;
    id = setTimeout(resolve, millis);
    if (!cancellationToken || cancellationToken.state === "none") {
      return;
    }

    unregister = cancellationToken.register(() => {
      clearTimeout(id);
      reject(Errors.resolve(cancellationToken.reason));
    });
  });

  return Object.defineProperty(promise, Symbol.dispose, {
    value: () => {
      clearTimeout(id);
      unregister?.();
      rej(new DisposedError());
    },
  }) as Promise<void> & Disposable;
}
