export default class DisposedError extends Error {
  constructor() {
    super("Object is disposed");
    this.name = "DisposedError";
  }
}
