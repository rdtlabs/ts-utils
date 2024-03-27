import { type CancellationToken } from "./CancellationToken.ts";
import { __unwrap } from "./_utils.ts";

export function unwrapAbortSignal(
  cancellation: CancellationToken,
): AbortSignal {
  return __unwrap(cancellation);
}
