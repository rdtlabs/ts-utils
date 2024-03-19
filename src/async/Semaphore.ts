import { type CancellationToken } from "../cancellation/CancellationToken.ts";
import { deferred } from "./Deferred.ts";
import cancellationTimeout from "../cancellation/cancellationTimeout.ts";
import isCancellationToken from "../cancellation/isCancellationToken.ts";
import { WaitHandle } from "./WaitHandle.ts";
import CancellationError from "../cancellation/CancellationError.ts";

export type Semaphore = WaitHandle & {
  tryAcquire(): boolean;
  acquire(cancellationToken?: CancellationToken): Promise<void>;
  release(count?: number): void;
  permits(): number;
  waiters(): number;
};

export const Semaphore = function (permits: number) {
  return semaphore(permits);
} as unknown as {
  new (permits: number): Semaphore;
};

export function semaphore(permits: number): Semaphore {
  if (permits < 0) {
    throw new Error("Semaphore initial permits must be >= 0");
  }

  let _permits = permits;
  const _awaiters: Array<() => void> = [];

  function addAwaiter(resolve: () => void) {
    _awaiters.push(resolve);
  }

  function removeAwaiter(resolve?: () => void) {
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
    tryAcquire() {
      if (_permits > 0) {
        _permits--;
        return true;
      }
      return false;
    },
    async acquire(cancellationToken?: CancellationToken) {
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
    release(count = 1) {
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
    wait(...args: any[]) {
      if (args.length === 0) {
        return this.acquire();
      }

      if (args.length !== 1) {
        return Promise.reject(new Error("invalid arguments"));
      }

      const cancellation = isCancellationToken(args[0])
        ? args[0]
        : cancellationTimeout(args[0]);

      return this.acquire(cancellation).then(() => true);
    },
  } as Semaphore;
}
