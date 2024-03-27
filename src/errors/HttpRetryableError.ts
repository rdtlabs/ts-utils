import { RetryableError } from "./RetryableError.ts";

export class HttpRetryableError extends RetryableError {
  constructor(code: number, reason?: unknown) {
    super(typeof reason === "string" ? reason : "HTTP retryable error");
    this.httpCode = code;
    this.cause = typeof reason !== "string" ? reason : undefined;
  }

  public readonly httpCode: number;
}
