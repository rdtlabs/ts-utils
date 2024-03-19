export class BufferFullError extends Error {
  constructor(message?: string) {
    super(message ?? "Buffer is full");
    this.name = "BufferFullError";
  }
}
