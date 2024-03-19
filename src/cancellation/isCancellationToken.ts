import { type CancellationToken } from "./CancellationToken.ts";
import { __isToken } from "./_utils.ts";

export default function isCancellationToken(
  value: unknown,
): value is CancellationToken {
  return __isToken(value);
}
