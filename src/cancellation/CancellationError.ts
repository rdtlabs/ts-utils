import type { ErrorLike } from "../types.ts";
import type { CancellationToken } from "./CancellationToken.ts";

// deno-lint-ignore no-explicit-any
let captureStackTrace = (Error as any).captureStackTrace ?? (() => {});

export class CancellationError extends Error {
  readonly #token?: CancellationToken;
  readonly #cause?: ErrorLike;

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

  public get token(): CancellationToken | undefined {
    return this.#token;
  }

  public get cause(): ErrorLike {
    return this.#cause ?? this.#token?.reason;
  }
}

function getCause(
  token?: CancellationToken,
  cause?: ErrorLike,
): { cause?: ErrorLike; token?: CancellationToken } {
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
