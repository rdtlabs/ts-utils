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
import type { TimeoutInput } from "../types.ts";

/**
 * Represents a semaphore, which is a synchronization primitive that limits the number of concurrent accesses to a shared resource.
 * return a new instance of a Semaphore with the specified number of permits.
 */
export const Semaphore = (function (permits: number): Semaphore {
  return semaphore(permits);
}) as unknown as {
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

  // Number of available permits
  let _permits = permits;

  // Queue of resolve functions waiting for permits
  // When a permit becomes available, we call resolve() to notify the waiter
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
    acquire(cancellationToken?: CancellationToken): Promise<void> {
      // Fast path: if permit available, return resolved promise immediately
      if (this.tryAcquire()) {
        return Promise.resolve();
      }

      // Simple path: no cancellation support needed
      if (!cancellationToken || cancellationToken.state === "none") {
        return new Promise<void>((r) => addAwaiter(r));
      }

      // Cancellable path: check if already cancelled
      if (cancellationToken.isCancelled) {
        return Promise.reject(
          cancellationToken.reason ?? new CancellationError(cancellationToken),
        );
      }

      const controller = deferred(cancellationToken);
      addAwaiter(controller.resolve);

      // Handle cancellation by removing from awaiter queue
      // Return the same promise (not a new one from .catch())
      return controller.promise.catch((e) => {
        if (e instanceof CancellationError) {
          removeAwaiter(controller.resolve);
        }
        // Re-throw to propagate the error to the caller
        throw e;
      });
    },
    release(count = 1): void {
      if (count <= 0) {
        throw new Error("Release count must be at least 1");
      }

      // Determine how many waiters we can resolve immediately
      const waitersToResolve = Math.min(count, _awaiters.length);

      // Update permits: add count, subtract the ones we're giving to waiters
      _permits += count - waitersToResolve;

      // Resolve waiters without modifying permits (already accounted for above)
      // Use queueMicrotask to avoid deep call stacks with many waiters
      if (waitersToResolve > 0) {
        const resolvers = _awaiters.splice(0, waitersToResolve);
        for (const resolve of resolvers) {
          queueMicrotask(resolve);
        }
      }
    },
    wait(arg?: TimeoutInput | CancellationToken): Promise<void> {
      if (arg === undefined) {
        return this.acquire();
      }

      return this.acquire(CancellationInput.of(arg));
    },
  } as Semaphore;
}
