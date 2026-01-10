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

  if (Number.isNaN(maxConcurrency)) {
    throw new TypeError("maxConcurrency must be a valid number");
  }

  if (!Number.isInteger(maxConcurrency)) {
    throw new TypeError("maxConcurrency must be an integer");
  }

  if (Number.isNaN(maxQueueLength)) {
    throw new TypeError("maxQueueLength must be a valid number");
  }

  if (!Number.isInteger(maxQueueLength)) {
    throw new TypeError("maxQueueLength must be an integer");
  }

  return {
    maxConcurrency,
    maxQueueLength,
  };
}
