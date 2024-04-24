import { type ErrorLike } from "../types.ts";
import { CancellationError } from "./CancellationError.ts";
import { type CancellationToken } from "./CancellationToken.ts";

const signalSym: unique symbol = Symbol("Symbol.CancellationToken");

export function __createToken(
  signal: AbortSignal,
  token?: Record<PropertyKey, unknown>,
): CancellationToken {
  // deno-lint-ignore no-explicit-any
  const isCancelled = (token as any)?.getIsCancelled ?? (() => signal.aborted);
  const getError = (() => {
    let error: CancellationError | undefined;
    return (reason?: ErrorLike) => {
      if (error) {
        return error;
      }

      if (!reason) {
        if (!signal.aborted) {
          return;
        }
        return error = new CancellationError(cancellation, signal.reason);
      }

      if (reason instanceof CancellationError) {
        return error = reason;
      }

      return error = new CancellationError(cancellation, reason);
    };
  })();

  const cancellation = {
    get state() {
      return signal.aborted ? "cancelled" : "active";
    },
    get reason() {
      return getError();
    },
    get isCancelled() {
      return isCancelled();
    },
    toAbortSignal: () => signal,
    throwIfCancelled(): void {
      const error = getError();
      if (error) {
        throw error;
      }
    },
    register(callback: (token: CancellationToken) => void): () => void {
      const cb = () => callback(cancellation);

      signal.addEventListener("abort", cb, { once: true });

      return () => signal.removeEventListener("abort", cb);
    },
    [signalSym]: signal,
    ...(token ?? {}),
  } as unknown as CancellationToken;

  return cancellation;
}

export function __unwrap(cancellation: CancellationToken): AbortSignal {
  // deno-lint-ignore no-explicit-any
  const signal = (cancellation as any)[signalSym];
  if (!signal) {
    throw new Error("Invalid cancellation token");
  }
  return signal;
}

export function __isToken(
  cancellation: unknown,
): cancellation is CancellationToken {
  // deno-lint-ignore no-explicit-any
  return !!cancellation && (cancellation as any)[signalSym] !== undefined;
}

const NEVER_SIGNAL = new AbortController().signal;

export const __never = Object.freeze({
  [signalSym]: NEVER_SIGNAL,
  isCancelled: false,
  state: "none",
  reason: undefined,
  throwIfCancelled: () => {},
  toAbortSignal: () => NEVER_SIGNAL,
  register: () => {
    return () => {};
  },
}) as CancellationToken;
