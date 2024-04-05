import { type TimeoutInput } from "./types.ts";

export function deriveTimeout(timeout: TimeoutInput): number {
  if (timeout instanceof Date) {
    return Math.max(0, timeout.getTime() - Date.now());
  }

  if (typeof timeout === "number") {
    return timeout;
  }

  if (typeof timeout?.remainingMillis === "number") {
    return timeout.remainingMillis;
  }

  throw new TypeError("Invalid timeout");
}
