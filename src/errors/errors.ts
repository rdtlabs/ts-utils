import {
  DataTooLargeError,
  HttpNonRetryableError,
  HttpRetryableError,
  RateLimitError,
} from "./error.types.ts";

/**
 * This module contains various error utilities for assisting with the
 * detection and handling of transient errors. Much has not been exported
 * as the module is meant to be used as a utility module for limited use.
 * @module errors
 */
export const Errors = Object.freeze({
  isTransient: (error: unknown): boolean => {
    return isTransientInternal(error, 0);
  },

  resolve: (error: unknown, altMessage?: string): Error => {
    if (error instanceof Error) {
      return error;
    }

    if (typeof error === "string") {
      return new Error(error);
    }

    return new Error(altMessage ?? "An unknown error occurred", {
      cause: error,
    });
  },

  rethrow: (error: unknown, altMessage?: string): never => {
    throw Errors.resolve(error, altMessage);
  },

  getErrorForHttpCode: (code: number, statusText?: string): Error => {
    if (code === 429) {
      return new RateLimitError(statusText);
    }

    if (code === 413) {
      return new DataTooLargeError(statusText);
    }

    statusText ??= "Unexpected error occurred";
    if (Errors.isTransient(code)) {
      return new HttpRetryableError(code, statusText);
    }

    return new HttpNonRetryableError(code, statusText);
  },
}) as {
  /**
   * Determines if the error is transient and should be retried.
   * @param error The error to check.
   * @returns A boolean indicating whether the error is transient.
   */
  isTransient: (error: unknown) => boolean;

  /**
   * Resolves the http code as an instance of `Error`.
   * @param code The error to resolve.
   * @param statusText The status text of the error.
   * @returns An instance of `Error` representing the http code.
   */
  getErrorForHttpCode: (code: number, statusText?: string) => Error;

  /**
   * Resolves the error as an instance of `Error`.
   * @param error The error to resolve.
   * @param altMessage An alternative message to use if the error is not an instance of `Error`.
   * @returns An instance of `Error` representing the error.
   */
  resolve: (error: unknown, altMessage?: string) => Error;

  /**
   * Re-throws the error as an instance of `Error`.
   * @param error The error to throw.
   * @param altMessage An alternative message to use if the error is not an instance of `Error`.
   * @returns This function never returns.
   */
  rethrow: (error: unknown, altMessage?: string) => never;
};

function isTransientInternal(err: unknown, depth: number): boolean {
  // deno-lint-ignore no-explicit-any
  let error = err as any;
  if (depth >= 3) {
    return false;
  }

  if (error === undefined || error === null) {
    return false;
  }

  if (typeof error === "string") {
    if (
      error === "ECONNRESET" ||
      error === "ECONNREFUSED" ||
      error === "ECONNABORTED" ||
      error === "ETIMEDOUT"
    ) {
      return true;
    }
    error = parseInt(error, 10);
    if (isNaN(error)) {
      return false;
    }
  }

  if (typeof error === "number") {
    return error === 429 || error === 500 || error === 503 || error === 504;
  }

  if (typeof error !== "object") {
    return false;
  }

  if (typeof error.isTransientError === "boolean") {
    return error.isTransientError === true;
  }

  if (typeof error.isRetryable === "boolean") {
    return error.isRetryable === true;
  }

  if (error.code !== undefined && error.code !== null) {
    return isTransientInternal(error.code, depth + 1);
  }

  const status = error.response?.status ?? error.request?.status;
  if (status === undefined || status === null) {
    // probably a network error if it was during the request (e.g., no response)
    return error?.response === undefined || error?.response === null;
  }

  return isTransientInternal(status, depth + 1);
}
