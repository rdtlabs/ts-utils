import { type ErrorLike } from "../types.ts";
import {
  type CancellationController,
  type CancellationToken,
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
  });

  return controller;
}
