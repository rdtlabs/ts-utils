import { type CancellationToken } from "./CancellationToken.ts";
import { __injectOrCreate, __unwrap } from "./_utils.ts";

export default function cancellationSignal(
  signal: AbortSignal,
): CancellationToken {
  return __injectOrCreate(signal);
}
