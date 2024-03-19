import isTransientError from "./isTransientError.ts";
import getErrorForHttpCode from "./getErrorForHttpCode.ts";

export { default as ArgumentNilError } from "./ArgumentNilError.ts";
export { default as DataTooLargeError } from "./DataTooLargeError.ts";
export { default as getErrorForHttpCode } from "./getErrorForHttpCode.ts";
export { default as HttpNonRetryableError } from "./HttpNonRetryableError.ts";
export { default as HttpRetryableError } from "./HttpRetryableError.ts";
export { default as InvalidArgumentError } from "./InvalidArgumentError.ts";
export { default as isTransientError } from "./isTransientError.ts";
export { default as NonRetryableError } from "./NonRetryableError.ts";
export { default as RateLimitError } from "./RateLimitError.ts";
export { default as RetryableError } from "./RetryableError.ts";

export const Errors = Object.freeze({
  // deno-lint-ignore no-explicit-any
  isTransient: (error: any): boolean => {
    return isTransientError(error);
  },

  getErrorForHttpCode: (code: number, statusText?: string): Error => {
    return getErrorForHttpCode(code, statusText);
  },
});
