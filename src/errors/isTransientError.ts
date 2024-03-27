export function isTransientError(error: unknown): boolean {
  return isTransientInternal(error, 0);
}

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
