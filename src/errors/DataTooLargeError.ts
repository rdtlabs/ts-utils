import { NonRetryableError } from "./NonRetryableError.ts";

export class DataTooLargeError extends NonRetryableError {
  constructor(reason?: unknown) {
    super(typeof reason === "string" ? reason : "Data too large");
    this.cause = typeof reason !== "string" ? reason : undefined;
    this.name = "DataTooLargeError";
  }
}
