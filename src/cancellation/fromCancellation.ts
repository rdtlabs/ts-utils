import { type ErrorLike } from "../common/types.ts";
import {
  type CancellationController,
  type CancellationToken,
} from "./CancellationToken.ts";

import createCancellation from "./createCancellation.ts";
import combineTokens from "./combineTokens.ts";

export default function fromCancellation(
  token?: CancellationToken,
): CancellationController {
  if (!token || token.state === "none") {
    return createCancellation();
  }

  if (token.isCancelled) {
    return Object.freeze({
      get token() {
        return token;
      },
      cancel() {
        // no-op
      },
    });
  }

  const controller = createCancellation();
  const cancellation = combineTokens(controller.token, token);
  return Object.freeze({
    get token() {
      return cancellation;
    },
    cancel(reason?: ErrorLike) {
      controller.cancel(reason);
    },
  });
}
