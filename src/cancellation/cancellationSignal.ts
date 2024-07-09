import type { CancellationToken } from "./CancellationToken.ts";
import { __createToken } from "./_utils.ts";

/**
 * Creates a CancellationToken from an AbortSignal.
 * @param signal The AbortSignal to create the CancellationToken from.
 * @returns The created CancellationToken.
 */
export function cancellationSignal(
  signal: AbortSignal,
): CancellationToken {
  return __createToken(signal);
}
