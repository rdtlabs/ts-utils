export class QueueLengthExceededError extends Error {
  constructor(message: string) {
    super(message);
  }
}
