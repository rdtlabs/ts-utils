import { type ErrorLike } from "../common/types.ts";
import { __injectOrCreate } from "./_utils.ts";
import CancellationError from "./CancellationError.ts";

export default function cancelledToken(reason?: ErrorLike) {
  return __injectOrCreate(
    AbortSignal.abort(
      reason instanceof CancellationError
        ? reason
        : new CancellationError(undefined, reason),
    ),
  );
}
