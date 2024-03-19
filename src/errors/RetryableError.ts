import { __getErrorMessage } from "./_utils.ts";

export default class RetryableError extends Error {
  public constructor(error: unknown, retryAfter?: number) {
    super(typeof error === "string" ? error : "Retryable error", {
      cause: error,
    });
    this.retryAfter = retryAfter;
  }

  public readonly isRetryable = true;
  public readonly retryAfter?: number;
}
