import { type CancellationToken } from "../cancellation/CancellationToken.ts";
import { semaphore } from "./Semaphore.ts";
import { WaitHandle } from "./WaitHandle.ts";

export type Mutex = WaitHandle & {
  tryLock(): boolean;
  lock(token?: CancellationToken): Promise<void>;
  unlock(): void;
  readonly isLocked: boolean;
};

export const Mutex = function () {
  return mutex();
} as unknown as {
  new (): Mutex;
};

export function mutex(): Mutex {
  const sem = semaphore(1);
  return {
    // deno-lint-ignore no-explicit-any
    wait: (...args: any[]) => sem.acquire(...args),
    tryLock: () => sem.tryAcquire(),
    lock: (token?: CancellationToken) => sem.acquire(token),
    unlock() {
      if (sem.permits() === 0) {
        sem.release();
      }
    },
    get isLocked() {
      return sem.permits() === 0;
    },
  };
}
