import { BufferFullError } from "../../buffer/BufferFullError.ts";

/**
 * Error thrown when attempting to enqueue an item into a full queue.
 */
export class QueueFullError extends BufferFullError {
  constructor() {
    super("Queue is full");
    this.name = "QueueFullError";
  }
}

/**
 * Error thrown when attempting to dequeue an item from close queue.
 */
export class QueueClosedError extends Error {
  constructor(message?: string) {
    super(message ?? "Queue is closed");
    this.name = "QueueClosedError";
  }
}

/**
 * Error thrown when attempting to add to a read-only queue.
 */
export class QueueReadOnlyError extends Error {
  constructor() {
    super("Queue is read-only");
    this.name = "QueueReadOnlyError";
  }
}
