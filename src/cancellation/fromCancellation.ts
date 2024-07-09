import type { ErrorLike } from "../types.ts";
import type {
  CancellationController,
  CancellationToken,
} from "./CancellationToken.ts";

import { createCancellation } from "./createCancellation.ts";
import { combineTokens } from "./combineTokens.ts";

/**
 * Creates a `CancellationController` from a `CancellationToken`.
 * If the provided token is not defined or in the "none" state, a new cancellation controller is created.
 * If the provided token is already cancelled, a completed/cancelled cancellation controller is returned with the same token.
 * Otherwise, a new cancellation controller is created and combined with the provided token.
 * @param token The optional `CancellationToken` to create the cancellation controller from.
 * @returns A `CancellationController` object.
 */
export function fromCancellation(
  token?: CancellationToken,
): CancellationController {
  if (!token || token.state === "none") {
    return createCancellation();
  }

  if (token.isCancelled) {
    return Object.freeze({
      get token(): CancellationToken {
        return token;
      },
      cancel(): void {
        // no-op
      },
      cancelAfter(): Promise<void> {
        return Promise.resolve();
      },
    });
  }

  const controller = createCancellation();
  const cancellation = combineTokens(controller.token, token);
  return Object.freeze({
    get token() {
      return cancellation;
    },
    cancel(reason?: ErrorLike): void {
      controller.cancel(reason);
    },
    cancelAfter(timeoutMillis: number, reason?: ErrorLike): Promise<void> {
      return controller.cancelAfter(timeoutMillis, reason);
    },
  });
}
