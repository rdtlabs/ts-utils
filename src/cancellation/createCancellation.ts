import { type ErrorLike, TimeoutInput } from "../types.ts";
import type {
  CancellationController,
  CancellationToken,
} from "./CancellationToken.ts";
import { cancellationSignal } from "./cancellationSignal.ts";

export function createCancellation(): CancellationController {
  const abortController = new AbortController();
  const cancellation = cancellationSignal(abortController.signal);

  const controller = Object.freeze({
    get token(): CancellationToken {
      return cancellation;
    },
    cancel(reason?: ErrorLike): void {
      if (!abortController.signal.aborted) {
        abortController.abort(reason);
      }
    },
    cancelAfter(
      timeoutMillis: TimeoutInput,
      reason?: ErrorLike,
    ): Promise<void> {
      if (abortController.signal.aborted) {
        return Promise.resolve();
      }

      return new Promise((resolve) => {
        const timerId = setTimeout(() => {
          try {
            controller.cancel(reason);
          } finally {
            resolve();
            unregister();
          }
        }, Math.max(0, TimeoutInput.deriveTimeout(timeoutMillis)));

        const unregister = controller.token.register(() => {
          clearTimeout(timerId);
          resolve();
        });
      });
    },
  });

  return controller;
}
