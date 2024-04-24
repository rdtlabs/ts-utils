/**
 * This module contains a semantically equivalent cancellation pattern used
 * in C#. This pattern is used to cancel async operations and allow for basic
 * structured concurrent cancellation.
 * @module cancellation
 */

export * from "./CancellationToken.ts";
export { Cancellable } from "./Cancellable.ts";
export { CancellationError } from "./CancellationError.ts";
export {
  CancellationOptions,
  type CancellationOptionsExtended,
} from "./CancellationOptions.ts";
