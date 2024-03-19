import DataTooLargeError from "./DataTooLargeError.ts";
import NonRetryableError from "./NonRetryableError.ts";
import RateLimitError from "./RateLimitError.ts";
import RetryableError from "./RetryableError.ts";
import isTransientError from "./isTransientError.ts";

export default function getErrorForHttpCode(
  code: number,
  statusText?: string,
): Error {
  if (code === 429) {
    return new RateLimitError(statusText);
  }

  if (code === 413) {
    return new DataTooLargeError(statusText);
  }

  statusText ??= "Unexpected error occurred";
  if (isTransientError(code)) {
    return new RetryableError(statusText!);
  }

  return new NonRetryableError(statusText!);
}
