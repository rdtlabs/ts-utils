import type { ErrorLike, TimeoutInput } from "../types.ts";

export type Unregister = () => void;

export interface CancellationToken {
  get state(): "active" | "cancelled" | "none";
  get isCancelled(): boolean;
  get reason(): ErrorLike | undefined;
  throwIfCancelled(): void;
  register(callback: (token: CancellationToken) => void): Unregister;
  toAbortSignal(): AbortSignal;
}

export interface CancellationController {
  get token(): CancellationToken;
  cancel(reason?: ErrorLike): void;
  cancelAfter(timeoutMillis: TimeoutInput, reason?: ErrorLike): Promise<void>;
}
