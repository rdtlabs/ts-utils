import { type ErrorLike } from "../types.ts";
import { __createToken } from "./_utils.ts";
import { CancellationError } from "./CancellationError.ts";
import { type CancellationToken } from "./CancellationToken.ts";

export function cancelledToken(reason?: ErrorLike): CancellationToken {
  return __createToken(
    AbortSignal.abort(
      reason instanceof CancellationError
        ? reason
        : new CancellationError(undefined, reason),
    ),
  );
}
