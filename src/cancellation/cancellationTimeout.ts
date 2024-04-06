import { type CancellationToken } from "./CancellationToken.ts";
import { __deriveTimeout } from "./_utils.ts";
import { __createToken } from "./_utils.ts";
import { type TimeoutInput } from "../types.ts";

const timeoutSym: unique symbol = Symbol("Symbol.CancellationTimeout");

// deno-fmt-ignore
export function cancellationTimeout(timeoutMillis: number): CancellationToken; // deno-fmt-ignore
export function cancellationTimeout(date: Date): CancellationToken; // deno-fmt-ignore
export function cancellationTimeout(timeoutInput: TimeoutInput): CancellationToken; // deno-fmt-ignore
export function cancellationTimeout(timeoutInput: TimeoutInput): CancellationToken {
  const derivedTimeout = __deriveTimeout(timeoutInput);
  const abortController = new AbortController();
  const cancellation = __createToken(abortController.signal, {
    [timeoutSym]: derivedTimeout,
  });

  const sysShutdown = () => {
    try {
      clearTimeout(timerId);
      if (!abortController.signal.aborted) {
        abortController.abort("beforeunload event. shutting down cancellation timer");
      }
    } catch (error) {
      console.error(error);
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

  return cancellation;
}

export function getTimeout(
  cancellation: CancellationToken,
): number | undefined {
  // deno-lint-ignore no-explicit-any
  return (cancellation as any)[timeoutSym];
}
