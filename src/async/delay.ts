import { DeadlineExceededError } from "../deadline.ts";
import { DisposedError } from "../DisposedError.ts";
import type { CancellationToken } from "../cancellation/CancellationToken.ts";
import { Errors } from "../errors/errors.ts";
import { TimeoutInput } from "../types.ts";

/**
 * Creates a promise that will complete after the specified delay.
 * @param delayMillis A value representing the delay in milliseconds.
 * @param timeout A value representing the delay as a 'TimeoutInput' (number, Date, Deadline).
 * @param cancellationToken An optional cancellation token that can be used to cancel the delay.
 * @returns A promise that will resolve after the specified delay.
 */
export function delay(
  delayMillis: number,
  cancellationToken?: CancellationToken,
): Promise<void> & Disposable {
  let rej!: (reason: unknown) => void;
  let id!: number;
  let unregister: (() => void) | undefined;
  const promise = new Promise<void>((resolve, reject) => {
    if (cancellationToken?.isCancelled === true) {
      reject(Errors.resolve(cancellationToken.reason));
      return;
    }

    id = setTimeout(() => {
      resolve();
      unregister?.();
    }, Math.max(0, delayMillis));

    rej = reject;
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
      if (id !== undefined) {
        clearTimeout(id);
      }
      rej?.(new DisposedError());
      unregister?.();
    },
  }) as Promise<void> & Disposable;
}

/**
 * Creates a promise that will complete after the specified delay.
 * @param delayMillis A value representing the delay in milliseconds.
 * @param deadline A value representing the deadline as a 'TimeoutInput' (number, Date, Deadline).
 * @param cancellationToken An optional cancellation token that can be used to cancel the delay.
 * @returns A promise that will resolve after the specified delay.
 */
export function delayWithDeadline(
  delayMillis: number,
  deadline?: TimeoutInput,
  cancellationToken?: CancellationToken,
): Promise<void> & Disposable {
  const timeoutMillis = TimeoutInput.maxMs(delayMillis, deadline);
  if (timeoutMillis < 0) {
    return Object.defineProperty(
      Promise.reject(new DeadlineExceededError()),
      Symbol.dispose,
      {
        value: () => {},
      },
    ) as Promise<void> & Disposable;
  }

  return delay(timeoutMillis, cancellationToken);
}

/**
 * Calculates an exponential backoff delay with optional jitter.
 * @param attempt The current attempt number (0-based).
 * @param baseDelay The base delay in milliseconds. Default is 100ms.
 * @param maxDelay The maximum delay in milliseconds. Default is 10,000ms.
 * @param jitter The jitter factor (0 to 1). Default is 0.3 (30%).
 * @returns The calculated delay in milliseconds.
 */
export function calculateExponentialDelay(
  attempt: number,
  baseDelay = 100,
  maxDelay = 10000,
  jitter = 0.3,
): number {
  if (attempt <= 0) {
    return 0;
  }

  const delay = Math.min(maxDelay, baseDelay * Math.pow(2, attempt));
  const jitterValue = delay * jitter;
  const minDelay = delay - jitterValue;
  const maxDelayWithJitter = delay + jitterValue;

  return Math.floor(
    Math.random() * (maxDelayWithJitter - minDelay + 1) + minDelay,
  );
}
