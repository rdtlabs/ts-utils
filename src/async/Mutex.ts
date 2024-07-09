/**
 * Represents a mutual exclusion lock, also known as a mutex.
 * A mutex allows multiple asynchronous operations to coordinate access to a shared resource,
 * ensuring that only one operation can access the resource at a time.
 */
import type { CancellationToken } from "../cancellation/CancellationToken.ts";
import { semaphore } from "./Semaphore.ts";
import type { WaitHandle } from "./WaitHandle.ts";

/**
 * Represents a mutual exclusion lock, also known as a mutex.
 * A mutex allows multiple asynchronous operations to coordinate access to a shared resource,
 * ensuring that only one operation can access the resource at a time.
 */
export interface Mutex extends WaitHandle {
  /**
   * Attempts to acquire the lock without blocking.
   * @returns A boolean indicating whether the lock was successfully acquired.
   */
  tryLock(): boolean;

  /**
   * Acquires the lock, potentially blocking the current operation until the lock is available.
   * @param token Optional cancellation token that can be used to cancel the lock acquisition.
   * @returns A promise that resolves when the lock is acquired.
   */
  lock(token?: CancellationToken): Promise<void>;

  /**
   * Releases the lock, allowing other operations to acquire it.
   */
  unlock(): void;

  /**
   * Gets a boolean indicating whether the lock is currently held.
   */
  readonly isLocked: boolean;
}

/**
 * Creates a new instance of a Mutex.
 * @returns A new instance of a Mutex.
 */
export const Mutex = function (): {
  new (): Mutex;
} {
  // deno-lint-ignore no-explicit-any
  return mutex() as any;
} as unknown as {
  new (): Mutex;
};

/**
 * Creates a new instance of a Mutex.
 * @returns A new instance of a Mutex.
 */
export function mutex(): Mutex {
  const sem = semaphore(1);
  return {
    /**
     * Acquires the lock, potentially blocking the current operation until the lock is available.
     * @param args Optional arguments to pass to the underlying semaphore's acquire method.
     * @returns A promise that resolves when the lock is acquired.
     */
    // deno-lint-ignore no-explicit-any
    wait: (...args: any[]) => sem.acquire(...args),

    /**
     * Attempts to acquire the lock without blocking.
     * @returns A boolean indicating whether the lock was successfully acquired.
     */
    tryLock: () => sem.tryAcquire(),

    /**
     * Acquires the lock, potentially blocking the current operation until the lock is available.
     * @param token Optional cancellation token that can be used to cancel the lock acquisition.
     * @returns A promise that resolves when the lock is acquired.
     */
    lock: (token?: CancellationToken) => sem.acquire(token),

    /**
     * Releases the lock, allowing other operations to acquire it.
     */
    unlock(): void {
      if (sem.permits() === 0) {
        sem.release();
      }
    },

    /**
     * Gets a boolean indicating whether the lock is currently held.
     */
    get isLocked() {
      return sem.permits() === 0;
    },
  };
}
