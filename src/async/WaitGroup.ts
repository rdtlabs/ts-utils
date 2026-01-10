import { signal } from "./Signal.ts";
import type { WaitHandle } from "./WaitHandle.ts";

/**
 * Represents a synchronization primitive that waits for a collection of asynchronous operations to complete.
 * It allows you to add and track the completion of multiple tasks.
 */
export interface WaitGroup extends WaitHandle {
  /**
   * Adds the specified delta to the WaitGroup's count.
   * @param delta The number to add to the count.
   */
  add(delta: number): void;

  /**
   * Signals the completion of a single task in the WaitGroup.
   */
  done(): void;

  /**
   * Gets the current count of the WaitGroup.
   */
  readonly count: number;
}

/**
 * Represents a synchronization primitive that waits for a collection of asynchronous operations to complete.
 */
export const WaitGroup = function (startCount?: number): {
  new (startCount?: number): WaitGroup;
} {
  // deno-lint-ignore no-explicit-any
  return waitGroup(startCount) as any;
} as unknown as {
  new (startCount?: number): WaitGroup;
};

/**
 * Creates a WaitGroup.
 * NOTE: Golang semantic for coordinating the start and
 * end of multiple concurrent tasks.
 * @param startCount - The initial count for the WaitGroup.
 * @returns The WaitGroup object.
 */
export function waitGroup(startCount?: number): WaitGroup {
  const _signal = signal(true);
  let _count = 0;
  const wg = {
    get count() {
      return _count;
    },
    done: () => wg.add(-1), // deno-lint-ignore no-explicit-any
    wait: (...args: any[]) => _signal.wait(...args),
    add(delta: number): void {
      const oldCount = _count;
      const newCount = oldCount + delta;
      if (newCount < 0) {
        throw new Error("negative WaitGroup count");
      }

      _count = newCount;
      if (newCount === 0) {
        _signal.notify();
      } else if (oldCount === 0) {
        // Only reset when transitioning FROM zero to prevent unnecessary work
        _signal.reset();
      }
    },
  };

  if (startCount) {
    wg.add(startCount);
  }

  return wg;
}
