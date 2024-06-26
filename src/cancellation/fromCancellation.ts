import type { ErrorLike } from "../types.ts";
import type {
  CancellationController,
  CancellationToken,
} from "./CancellationToken.ts";

import { createCancellation } from "./createCancellation.ts";
import { combineTokens } from "./combineTokens.ts";

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
