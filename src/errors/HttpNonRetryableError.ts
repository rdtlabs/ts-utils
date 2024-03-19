import NonRetryableError from "./NonRetryableError.ts";

export default class HttpNonRetryableError extends NonRetryableError {
  constructor(code: number, reason?: unknown) {
    super(typeof reason === "string" ? reason : "HTTP non-retryable error");
    this.httpCode = code;
    this.cause = typeof reason !== "string" ? reason : undefined;
  }

  public readonly httpCode: number;
}
