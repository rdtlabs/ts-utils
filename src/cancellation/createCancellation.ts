import { type ErrorLike } from "../common/types.ts";
import { type CancellationController } from "./CancellationToken.ts";
import cancellationSignal from "./cancellationSignal.ts";

export default function createCancellation(): CancellationController {
  const abortController = new AbortController();
  const cancellation = cancellationSignal(abortController.signal);

  const controller = Object.freeze({
    get token() {
      return cancellation;
    },
    cancel(reason?: ErrorLike) {
      if (!abortController.signal.aborted) {
        abortController.abort(reason);
      }
    },
  });

  return controller;
}
