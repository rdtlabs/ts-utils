import type { ErrorLike } from "../types.ts";
import type { CancellationToken } from "./CancellationToken.ts";

// deno-lint-ignore no-explicit-any
let captureStackTrace = (Error as any).captureStackTrace ?? (() => {});

/**
 * Represents an error that is thrown when an operation has been cancelled.
 */
export class CancellationError extends Error {
  readonly #token: CancellationToken | undefined;
  readonly #cause: ErrorLike | undefined;

  constructor(token?: CancellationToken, cause?: ErrorLike) {
    super(`Operation has been cancelled`);
    this.name = "CancellationError";
    const tpl = getCause(token, cause);
    this.#cause = tpl.cause;
    this.#token = tpl.token;

    try {
      captureStackTrace(this, CancellationError);
    } catch {
      // something is wrong. so ignore future errors
      captureStackTrace = () => {};
    }
  }

  /**
   * Gets the cancellation token associated with the error, if any.
   */
  public get token(): CancellationToken | undefined {
    return this.#token;
  }

  /**
   * Gets the cause of the cancellation error.
   * If a cause is not explicitly provided, it returns the reason from the cancellation token, if available.
   */
  public override get cause(): ErrorLike | undefined {
    return this.#cause ?? this.#token?.reason;
  }
}

function getCause(
  token?: CancellationToken,
  cause?: ErrorLike,
): { cause?: ErrorLike | undefined; token?: CancellationToken | undefined } {
  if (token) {
    if (
      !(
        "throwIfCancelled" in token &&
        "isCancelled" in token &&
        typeof token.throwIfCancelled === "function" &&
        typeof token.isCancelled === "boolean"
      )
    ) {
      console.warn("CancellationError created with an invalid token", token);
      throw new Error("CancellationError created with an invalid token");
    }

    if (token.isCancelled !== true) {
      console.warn(
        "CancellationError created with a non-cancelled token",
        token,
      );
      throw new Error("CancellationError created with a non-cancelled token");
    }
  }
  if (!cause) {
    return {
      token,
    };
  }

  if (cause instanceof CancellationError) {
    return {
      cause: cause.cause ?? cause,
      token: token ?? cause.token,
    };
  }

  return {
    cause,
    token,
  };
}
