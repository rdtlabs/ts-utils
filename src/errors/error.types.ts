export class RetryableError extends Error {
  public constructor(error: unknown, retryAfter?: number) {
    super(typeof error === "string" ? error : "Retryable error", {
      cause: error,
    });
    this.retryAfter = retryAfter;
  }

  public readonly isRetryable: boolean = true;
  public readonly retryAfter?: number | undefined;
}

export class NonRetryableError extends Error {
  public constructor(error: unknown) {
    super(typeof error === "string" ? error : "Non-retryable error", {
      cause: error,
    });
  }

  public readonly isRetryable: boolean = false;
}

export class HttpRetryableError extends RetryableError {
  constructor(code: number, reason?: unknown) {
    super(typeof reason === "string" ? reason : "HTTP retryable error");
    this.httpCode = code;
    this.cause = typeof reason === "string" ? undefined : reason;
  }

  public readonly httpCode: number;
}

export class HttpNonRetryableError extends NonRetryableError {
  constructor(code: number, reason?: unknown) {
    super(typeof reason === "string" ? reason : "HTTP non-retryable error");
    this.httpCode = code;
    this.cause = typeof reason === "string" ? undefined : reason;
  }

  public readonly httpCode: number;
}

export class InvalidArgumentError extends Error {
  constructor(nameOrArgs?: string | { name?: string; message?: string }) {
    super(__getErrorMessage(nameOrArgs));
  }
}

export class ArgumentNilError extends InvalidArgumentError {
  constructor(nameOrArgs?: string | { name?: string; message?: string }) {
    super(__getErrorMessage(nameOrArgs, true));
  }
}

export class DataTooLargeError extends NonRetryableError {
  constructor(reason?: unknown) {
    super(typeof reason === "string" ? reason : "Data too large");
    this.cause = typeof reason === "string" ? undefined : reason;
    this.name = "DataTooLargeError";
  }
}

export class RateLimitError extends RetryableError {
  constructor(error?: unknown, retryAfter?: number) {
    super(typeof error === "string" ? error : "Too many requests", retryAfter);
    this.cause = typeof error === "string" ? undefined : error;
  }
}

export class ShutdownError extends NonRetryableError {}

export class QueueLengthExceededError extends Error {}

const asNilOrInvalidName = (a: string, b: boolean) =>
  `Argument '${a}' is ${b ? "nil" : "invalid"}`;

const asNilOrInvalid = (b: boolean) => `Argument is ${b ? "nil" : "invalid"}`;

function __getErrorMessage(
  args?: string | { name?: string; message?: string },
  isNil = false,
): string {
  if (!args) {
    return asNilOrInvalid(isNil);
  }

  if (typeof args === "string") {
    return asNilOrInvalidName(args, isNil);
  }

  if (!args.message) {
    return args.name
      ? asNilOrInvalidName(args.name, isNil)
      : asNilOrInvalid(isNil);
  }

  if (!args.name) {
    return `${asNilOrInvalid(isNil)}\n${args.message}`;
  }

  return `Argument '${args.name}' is ${
    isNil ? "nil" : "invalid"
  }\n${args.message}`;
}
