import { type ErrorLike } from "../common/types.ts";
import { __injectOrCreate } from "./_utils.ts";
import { CancellationError } from "./CancellationError.ts";
import { type CancellationToken } from "./CancellationToken.ts";

export function cancelledToken(reason?: ErrorLike): CancellationToken {
  return __injectOrCreate(
    AbortSignal.abort(
      reason instanceof CancellationError
        ? reason
        : new CancellationError(undefined, reason),
    ),
  );
}
