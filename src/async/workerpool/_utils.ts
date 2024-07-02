export function fromOptions(options?: {
  maxConcurrency?: number;
  maxQueueLength?: number;
}): {
  maxConcurrency: number;
  maxQueueLength: number;
} {
  const maxQueueLength = options?.maxQueueLength ?? 1024;
  const maxConcurrency = options?.maxConcurrency ?? 4;

  if (!maxConcurrency || maxConcurrency < 1) {
    throw new Error(
      "Invalid maxConcurrency. Value must be > 0.",
    );
  }

  if (!maxQueueLength || maxQueueLength < 1) {
    throw new Error(
      "Invalid maxQueueLength. Value must be > 0.",
    );
  }

  if (maxQueueLength < maxConcurrency) {
    throw new Error(
      "Invalid maxQueueLength. maxQueueLength must be >= maxConcurrency.",
    );
  }

  return {
    maxConcurrency,
    maxQueueLength,
  };
}
