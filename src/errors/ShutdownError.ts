import { NonRetryableError } from "./NonRetryableError.ts";

export class ShutdownError extends NonRetryableError {
  constructor(message: string) {
    super(message);
  }
}
