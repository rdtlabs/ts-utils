import type { CancellationToken } from "./CancellationToken.ts";
import { __createToken } from "./_utils.ts";
import { TimeoutInput } from "../types.ts";
import { DisposedError } from "../DisposedError.ts";
import type { Deadline } from "../deadline.ts";

const timeoutSym: unique symbol = Symbol("Symbol.CancellationTimeout");

/**
 * Creates a cancellation token with a timeout.
 *
 * @param timeoutMillis - The timeout duration in milliseconds.
 * @returns A cancellation token that can be cancelled or disposed.
 */
// deno-fmt-ignore
export function cancellationTimeout(timeoutMillis: number): CancellationToken & Disposable; // deno-fmt-ignore

/**
 * Creates a cancellation token with a timeout.
 *
 * @param date - The date and time when the timeout will occur.
 * @returns A cancellation token that can be cancelled or disposed.
 */
export function cancellationTimeout(date: Date): CancellationToken & Disposable; // deno-fmt-ignore

/**
 * Creates a cancellation token with a timeout.
 *
 * @param deadline - The deadline when the timeout will occur.
 * @returns A cancellation token that can be cancelled or disposed.
 */
export function cancellationTimeout(deadline: Deadline): CancellationToken & Disposable; // deno-fmt-ignore

/**
 * Creates a cancellation token with a timeout.
 *
 * @param timeoutInput - The timeout duration or options.
 * @returns A cancellation token that can be cancelled or disposed.
 */
export function cancellationTimeout(timeoutInput: TimeoutInput): CancellationToken & Disposable; // deno-fmt-ignore

export function cancellationTimeout(timeoutInput: TimeoutInput): CancellationToken & Disposable {
  const derivedTimeout = TimeoutInput.deriveTimeout(timeoutInput);
  const abortController = new AbortController();
  const cancellation = __createToken(abortController.signal, {
    [timeoutSym]: derivedTimeout,
    [Symbol.dispose]: () => {
      clearTimeout(timerId);
      globalThis.removeEventListener(
        "beforeunload", sysShutdown
      );
      abortController.abort(new DisposedError());
    }
  });

  const sysShutdown = () => {
    try {
      clearTimeout(timerId);
      if (!abortController.signal.aborted) {
        abortController.abort("beforeunload event. shutting down cancellation timer");
      }
    } catch (error) {
      console.warn(error);
    }
  }

  const timerId = setTimeout(() => {
    globalThis.removeEventListener(
      "beforeunload", sysShutdown
    );
    abortController.abort();
  }, Math.max(0, derivedTimeout));

  globalThis.addEventListener(
    "beforeunload", sysShutdown
  );

  return cancellation as CancellationToken & Disposable;
}

/**
 * Retrieves the timeout value from the given cancellation token if available.
 * @param cancellation The cancellation token.
 * @returns The timeout value, or undefined if not available.
 */
export function getTimeout(
  cancellation: CancellationToken,
): number | undefined {
  // deno-lint-ignore no-explicit-any
  return (cancellation as any)[timeoutSym];
}
