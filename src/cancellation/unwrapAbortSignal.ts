import type { CancellationToken } from "./CancellationToken.ts";
import { __unwrap } from "./_utils.ts";

/**
 * Unwraps the `CancellationToken` and returns the underlying `AbortSignal`.
 *
 * @param cancellation The `CancellationToken` to unwrap.
 * @returns The underlying `AbortSignal`.
 */
export function unwrapAbortSignal(
  cancellation: CancellationToken,
): AbortSignal {
  return __unwrap(cancellation);
}
