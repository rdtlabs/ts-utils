import RetryableError from "./RetryableError.ts";
import { __getErrorMessage } from "./_utils.ts";

export default class RateLimitError extends RetryableError {
  constructor(error?: unknown, retryAfter?: number) {
    super(typeof error === "string" ? error : "Too many requests", retryAfter);
    this.cause = typeof error !== "string" ? error : undefined;
  }
}
