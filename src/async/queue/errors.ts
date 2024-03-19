import { BufferFullError } from "../../buffer/BufferFullError.ts";

export class QueueFullError extends BufferFullError {
  constructor() {
    super("Queue is full");
    this.name = "QueueFullError";
  }
}

export class QueueClosedError extends Error {
  constructor(message?: string) {
    super(message ?? "Queue is closed");
    this.name = "QueueClosedError";
  }
}

export class QueueReadOnlyError extends Error {
  constructor() {
    super("Queue is read-only");
    this.name = "QueueReadOnlyError";
  }
}
