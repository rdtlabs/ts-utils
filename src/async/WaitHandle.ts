import type { CancellationToken } from "../cancellation/CancellationToken.ts";
import type { TimeoutInput } from "../types.ts";

/**
 * Represents a handle that can be used to wait for an asynchronous operation to complete.
 */
export interface WaitHandle {
  /**
   * Waits for the asynchronous operation to complete.
   * @returns A Promise that resolves when the operation is complete.
   */
  wait(): Promise<void>;

  /**
   * Waits for the asynchronous operation to complete, with an optional timeout.
   * @param timeout - The timeout value in milliseconds.
   * @returns A Promise that resolves when the operation is complete or the timeout expires.
   */
  wait(timeout?: TimeoutInput): Promise<void>;

  /**
   * Waits for the asynchronous operation to complete, with an optional cancellation token.
   * @param cancellation - The cancellation token.
   * @returns A Promise that resolves when the operation is complete or the cancellation token is canceled.
   */
  wait(cancellation?: CancellationToken): Promise<void>;
}
