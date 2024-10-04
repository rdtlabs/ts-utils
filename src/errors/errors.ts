import { getErrorForHttpCode } from "./getErrorForHttpCode.ts";
import { isTransientError } from "./isTransientError.ts";

export const Errors = Object.freeze({
  isTransient: (error: unknown): boolean => {
    return isTransientError(error);
  },

  getErrorForHttpCode: (code: number, statusText?: string): Error => {
    return getErrorForHttpCode(code, statusText);
  },
  // resolveAsError: (error: unknown, altMessage?: string): Error => {
  //   if (error instanceof Error) {
  //     return error;
  //   }

  //   if (typeof error === "string") {
  //     return new Error(error);
  //   }

  //   return new Error(altMessage ?? "An unknown error occurred", { cause: error });
  // },

  // throwAsError: (error: unknown, altMessage?: string): never => {
  //   throw Errors.resolveAsError(error, altMessage);
  // }
}) as {
  isTransient: (error: unknown) => boolean;
  getErrorForHttpCode: (code: number, statusText?: string) => Error;
  // resolveAsError: (error: unknown, altMessage?: string) => Error;
  // throwAsError: (error: unknown, altMessage?: string) => never;
};
