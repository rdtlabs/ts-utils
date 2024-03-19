import { type CancellationToken } from "./CancellationToken.ts";
import { __unwrap } from "./_utils.ts";

export default function unwrapAbortSignal(
  cancellation: CancellationToken,
): AbortSignal {
  return __unwrap(cancellation);
}
