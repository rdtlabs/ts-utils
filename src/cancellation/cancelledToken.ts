import type { ErrorLike } from "../types.ts";
import { __createToken } from "./_utils.ts";
import { CancellationError } from "./CancellationError.ts";
import type { CancellationToken } from "./CancellationToken.ts";

/**
 * Creates a cancellation token that is already cancelled with the specified reason.
 * @param reason - The reason for the cancellation.
 * @returns A new CancellationToken that is already cancelled.
 */
export function cancelledToken(reason?: ErrorLike): CancellationToken {
  return __createToken(
    AbortSignal.abort(
      reason instanceof CancellationError
        ? reason
        : new CancellationError(undefined, reason),
    ),
  );
}
