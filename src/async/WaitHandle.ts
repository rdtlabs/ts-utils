import { type CancellationToken } from "../cancellation/CancellationToken.ts";
import { type TimeoutInput } from "../types.ts";

export interface WaitHandle {
  wait(): Promise<void>;
  wait(timeout?: TimeoutInput): Promise<void>;
  wait(cancellation?: CancellationToken): Promise<void>;
}