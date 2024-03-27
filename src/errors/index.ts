import { isTransientError } from "./isTransientError.ts";
import { getErrorForHttpCode } from "./getErrorForHttpCode.ts";

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
