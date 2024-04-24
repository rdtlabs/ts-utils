import { type CancellationToken } from "./CancellationToken.ts";
import { __createToken } from "./_utils.ts";
import { TimeoutInput } from "../types.ts";
import { DisposedError } from "../DisposedError.ts";

const timeoutSym: unique symbol = Symbol("Symbol.CancellationTimeout");

// deno-fmt-ignore
export function cancellationTimeout(timeoutMillis: number): CancellationToken & Disposable; // deno-fmt-ignore
export function cancellationTimeout(date: Date): CancellationToken & Disposable; // deno-fmt-ignore
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

export function getTimeout(
  cancellation: CancellationToken,
): number | undefined {
  // deno-lint-ignore no-explicit-any
  return (cancellation as any)[timeoutSym];
}
