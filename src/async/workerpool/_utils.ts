export function fromOptions(options?: {
  maxConcurrency?: number;
  maxQueueLength?: number;
}): {
  maxConcurrency: number;
  maxQueueLength: number;
} {
  const maxQueueLength = options?.maxQueueLength ?? 1024;
  const maxConcurrency = options?.maxConcurrency ?? 4;

  if (
    maxConcurrency === undefined ||
    maxConcurrency < 1 ||
    maxConcurrency > 32
  ) {
    throw new Error(
      "Invalid maxConcurrency. Value must be <= 1 and <= 32.",
    );
  }

  if (
    maxQueueLength === undefined ||
    maxQueueLength < 1 ||
    maxQueueLength > 1024
  ) {
    throw new Error(
      "Invalid maxQueueLength. Value must be <= 1 and <= 1024.",
    );
  }

  return {
    maxConcurrency,
    maxQueueLength,
  };
}
