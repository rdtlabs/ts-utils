/**
 * Error thrown when an object is disposed and an operation is attempted on it.
 */
export class DisposedError extends Error {
  constructor() {
    super("Object is disposed");
    this.name = "DisposedError";
  }
}
