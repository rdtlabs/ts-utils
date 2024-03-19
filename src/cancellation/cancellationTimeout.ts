import { type CancellationToken } from "./CancellationToken.ts";
import { __deriveTimeout } from "./_utils.ts";
import { __injectOrCreate } from "./_utils.ts";
import { type TimeoutInput } from "../common/types.ts";

const timeoutSym: unique symbol = Symbol("Symbol.CancellationTimeout");

// deno-fmt-ignore
export default function cancellationTimeout(timeoutMillis: number): CancellationToken; // deno-fmt-ignore
export default function cancellationTimeout(date: Date): CancellationToken; // deno-fmt-ignore
export default function cancellationTimeout(timeoutInput: TimeoutInput): CancellationToken; // deno-fmt-ignore
export default function cancellationTimeout(timeoutInput: TimeoutInput) {
  const derivedTimeout = __deriveTimeout(timeoutInput);
  const signal = AbortSignal.timeout(derivedTimeout);

  return __injectOrCreate(signal, {
    [timeoutSym]: derivedTimeout,
  });
}

export function getTimeout(
  cancellation: CancellationToken,
): number | undefined {
  // deno-lint-ignore no-explicit-any
  return (cancellation as any)[timeoutSym];
}
