import type { CancellationToken } from "../cancellation/CancellationToken.ts";
import { deferred } from "./Deferred.ts";
import type { WaitHandle } from "./WaitHandle.ts";
import { CancellationError } from "../cancellation/CancellationError.ts";
import { CancellationInput } from "../cancellation/cancellationInput.ts";

export interface Semaphore extends WaitHandle {
  tryAcquire(): boolean;
  acquire(cancellationToken?: CancellationToken): Promise<void>;
  release(count?: number): void;
  permits(): number;
  waiters(): number;
}

export const Semaphore = function (permits: number): {
  new (permits: number): Semaphore;
} {
  // deno-lint-ignore no-explicit-any
  return semaphore(permits) as any;
} as unknown as {
  new (permits: number): Semaphore;
};

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
        return Promise.reject(new Error("invalid arguments"));
      }

      return this.acquire(CancellationInput.of(args[0]));
    },
  } as Semaphore;
}
