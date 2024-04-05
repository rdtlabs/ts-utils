import { type ErrorLike } from "../types.ts";
import { type CancellationToken } from "./CancellationToken.ts";

let counter = 0;
export class CancellationError extends Error {
  readonly #token?: CancellationToken;
  readonly #cause?: ErrorLike;

  constructor(token?: CancellationToken, cause?: ErrorLike) {
    super(`[${counter++}] Operation has been cancelled`);
    this.name = "CancellationError";
    this.#cause = cause;
    if (token && token.isCancelled !== true) {
      throw new Error("CancellationError created with a non-cancelled token");
    } else {
      this.#token = token;
    }
  }

  public get token(): CancellationToken | undefined {
    return this.#token;
  }

  public get cause(): ErrorLike {
    return this.#cause ?? this.#token?.reason;
  }
}
