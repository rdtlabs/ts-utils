import NonRetryableError from "./NonRetryableError.ts";

export default class ShutdownError extends NonRetryableError {
  constructor(message: string) {
    super(message);
  }
}
