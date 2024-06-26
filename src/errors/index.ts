/**
 * This module contains various error utilities for assisting with the
 * detection and handling of transient errors. Much has not been exported
 * as the module is meant to be used as a utility module for limited use.
 * @module errors
 */

import { isTransientError } from "./isTransientError.ts";
import { getErrorForHttpCode } from "./getErrorForHttpCode.ts";

export { ArgumentNilError } from "./ArgumentNilError.ts";
export { DataTooLargeError } from "./DataTooLargeError.ts";
export { HttpNonRetryableError } from "./HttpNonRetryableError.ts";
export { HttpRetryableError } from "./HttpRetryableError.ts";
export { InvalidArgumentError } from "./InvalidArgumentError.ts";
export { NonRetryableError } from "./NonRetryableError.ts";
export { RateLimitError } from "./RateLimitError.ts";
export { RetryableError } from "./RetryableError.ts";
export { getErrorForHttpCode } from "./getErrorForHttpCode.ts";
export { isTransientError } from "./isTransientError.ts";

export const Errors = Object.freeze({
  isTransient: (error: unknown): boolean => {
    return isTransientError(error);
  },

  getErrorForHttpCode: (code: number, statusText?: string): Error => {
    return getErrorForHttpCode(code, statusText);
  },
}) as {
  isTransient: (error: unknown) => boolean;
  getErrorForHttpCode: (code: number, statusText?: string) => Error;
};
