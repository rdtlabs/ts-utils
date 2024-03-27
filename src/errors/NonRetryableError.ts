export class NonRetryableError extends Error {
  public constructor(error: unknown) {
    super(typeof error === "string" ? error : "Non-retryable error", {
      cause: error,
    });
  }

  public readonly isRetryable: boolean = false;
}
