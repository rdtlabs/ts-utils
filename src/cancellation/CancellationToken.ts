import type { ErrorLike, TimeoutInput } from "../types.ts";

export type Unregister = () => void;

/**
 * Represents a cancellation token that can be used to cancel an operation.
 */
export interface CancellationToken {
  /**
   * Gets the current state of the cancellation token.
   * Possible values are "active", "cancelled", or "none".
   */
  get state(): "active" | "cancelled" | "none";

  /**
   * Gets a boolean value indicating whether the cancellation token has been cancelled.
   */
  get isCancelled(): boolean;

  /**
   * Gets the reason for the cancellation, if any.
   */
  get reason(): ErrorLike | undefined;

  /**
   * Throws an error if the cancellation token has been cancelled.
   */
  throwIfCancelled(): void;

  /**
   * Registers a callback function to be called when the cancellation token is cancelled.
   * @param callback The callback function to be called when the cancellation token is cancelled.
   * @returns An object that can be used to unregister the callback.
   */
  register(callback: (token: CancellationToken) => void): Unregister;

  /**
   * Converts the cancellation token to an AbortSignal object.
   * @returns An AbortSignal object that can be used to abort operations.
   */
  toAbortSignal(): AbortSignal;
}

/**
 * Represents a controller for cancellation operations.
 */
export interface CancellationController {
  /**
   * Gets the cancellation token associated with this controller.
   */
  get token(): CancellationToken;

  /**
   * Cancels the operation with an optional reason.
   * @param reason - The reason for the cancellation.
   */
  cancel(reason?: ErrorLike): void;

  /**
   * Cancels the operation after a specified timeout, with an optional reason.
   * @param timeoutMillis - The timeout duration in milliseconds.
   * @param reason - The reason for the cancellation.
   * @returns A promise that resolves when the cancellation is complete.
   */
  cancelAfter(timeoutMillis: TimeoutInput, reason?: ErrorLike): Promise<void>;
}
