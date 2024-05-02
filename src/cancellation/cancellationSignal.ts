import type { CancellationToken } from "./CancellationToken.ts";
import { __createToken } from "./_utils.ts";

export function cancellationSignal(
  signal: AbortSignal,
): CancellationToken {
  return __createToken(signal);
}
