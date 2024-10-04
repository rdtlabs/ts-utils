/**
 * Represents a semaphore, which is a synchronization primitive that limits the number of concurrent accesses to a shared resource.
 * @interface
 * @extends WaitHandle
 */
export interface Semaphore extends WaitHandle {
  /**
   * Attempts to acquire a permit from the semaphore without blocking.
   * @returns {boolean} True if a permit was acquired, false otherwise.
   */
  tryAcquire(): boolean;

  /**
   * Acquires a permit from the semaphore, potentially blocking until a permit is available.
   * @param {CancellationToken} [cancellationToken] A cancellation token allowing caller to cancel waiting for the permit.
   * @returns {Promise<void>} A promise that resolves when a permit is acquired.
   */
  acquire(cancellationToken?: CancellationToken): Promise<void>;

  /**
   * Releases one or more permits back to the semaphore.
   * @param {number} [count=1] The number of permits to release.
   */
  release(count?: number): void;

  /**
   * Gets the number of permits currently available in the semaphore.
   * @returns {number} The number of permits.
   */
  permits(): number;

  /**
   * Gets the number of waiters currently waiting to acquire a permit from the semaphore.
   * @returns {number} The number of waiters.
   */
  waiters(): number;
}

import type { CancellationToken } from "../cancellation/CancellationToken.ts";
import { deferred } from "./Deferred.ts";
import type { WaitHandle } from "./WaitHandle.ts";
import { CancellationError } from "../cancellation/CancellationError.ts";
import { CancellationInput } from "../cancellation/cancellationInput.ts";
import { Promises } from "./Promises.ts";

/**
 * Represents a semaphore, which is a synchronization primitive that limits the number of concurrent accesses to a shared resource.
 * return a new instance of a Semaphore with the specified number of permits.
 */
export const Semaphore = function (permits: number): {
  new (permits: number): Semaphore;
} {
  // deno-lint-ignore no-explicit-any
  return semaphore(permits) as any;
} as unknown as {
  new (permits: number): Semaphore;
};

/**
 * Creates a new semaphore with the specified number of permits.
 * @param {number} permits The initial number of permits for the semaphore.
 * @returns {Semaphore} The created semaphore.
 * @throws {Error} If the initial number of permits is less than 0.
 */
export function semaphore(permits: number): Semaphore {
  if (permits < 0) {
    throw new Error("Semaphore initial permits must be >= 0");
  }

  let _permits = permits;
  const _awaiters: Array<() => void> = [];

  function addAwaiter(resolve: () => void): void {
    _awaiters.push(resolve);
  }

  function removeAwaiter(resolve?: () => void): void {
    if (resolve) {
      const index = _awaiters.indexOf(resolve);
      if (index !== -1) {
        _awaiters.splice(index, 1);
      }
    }
  }

  return {
    waiters: () => _awaiters.length,
    permits: () => _permits,
    tryAcquire(): boolean {
      if (_permits > 0) {
        _permits--;
        return true;
      }
      return false;
    },
    async acquire(cancellationToken?: CancellationToken): Promise<void> {
      if (this.tryAcquire()) {
        return;
      }

      if (!cancellationToken || cancellationToken.state === "none") {
        return await new Promise<void>((r) => addAwaiter(r));
      }

      cancellationToken.throwIfCancelled();

      const controller = deferred(cancellationToken);

      addAwaiter(controller.resolve);

      controller.promise.catch((e) => {
        if (e instanceof CancellationError) {
          removeAwaiter(controller.resolve);
        }
        throw e;
      });

      return await controller.promise;
    },
    release(count = 1): void {
      if (!count || count < 0) {
        throw new Error("Release count must be at least 1");
      }

      _permits += count;

      _awaiters
        .splice(0, count)
        .forEach((resolve) => {
          _permits--;
          resolve();
        });
    },
    // deno-lint-ignore no-explicit-any
    wait(...args: any[]): Promise<void> {
      if (args.length === 0) {
        return this.acquire();
      }

      if (args.length !== 1) {
        return Promises.reject(new Error("invalid arguments"));
      }

      return this.acquire(CancellationInput.of(args[0]));
    },
  } as Semaphore;
}
