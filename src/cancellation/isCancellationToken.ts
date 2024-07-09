import type { CancellationToken } from "./CancellationToken.ts";
import { __isToken } from "./_utils.ts";

/**
 * Checks if a value is a CancellationToken.
 * @param value The value to check.
 * @returns True if the value is a CancellationToken, false otherwise.
 */
export function isCancellationToken(
  value: unknown,
): value is CancellationToken {
  return __isToken(value);
}
