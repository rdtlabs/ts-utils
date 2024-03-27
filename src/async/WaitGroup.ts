import { signal } from "./Signal.ts";
import { WaitHandle } from "./WaitHandle.ts";

export interface WaitGroup extends WaitHandle {
  add(delta: number): void;
  done(): void;
  readonly count: number;
}

export const WaitGroup = function (startCount?: number) {
  return waitGroup(startCount) as WaitGroup;
} as unknown as {
  new (startCount?: number): WaitGroup;
};

/**
 * Golang semantic for coordinating the start and
 * end of multiple concurrenct tasks.
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
    add(delta: number) {
      const newCount = _count + delta;
      if (newCount < 0) {
        throw new Error("negative WaitGroup count");
      }

      _count = newCount;
      if (_count === 0) {
        _signal.notify();
      } else {
        _signal.reset();
      }
    },
  };

  if (startCount) {
    wg.add(startCount);
  }

  return wg;
}
