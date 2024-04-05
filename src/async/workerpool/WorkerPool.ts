import { QueueLengthExceededError } from "../../errors/QueueLengthExceededError.ts";
import { ShutdownError } from "../../errors/ShutdownError.ts";
import { ArgumentNilError } from "../../errors/ArgumentNilError.ts";
import { Deferred } from "../Deferred.ts";
import { fromOptions } from "./_utils.ts";
import { Queue } from "../../Queue.ts";

type Task = () => Promise<unknown> | unknown;

export type WorkerPoolOptions = {
  // defaults to 4
  maxConcurrency?: number;
  // defaults to Infinity
  maxQueueLength?: number;
};

export interface WorkerPool {
  submit(runnable: Task): void;
  trySubmit(runnable: Task): boolean;
  shutdown(): void;
  onShutdown(): Promise<void>;
  shutdownNow(): Task[];
  readonly isShutdownInitiated: boolean;
  readonly isShutdown: boolean;
  readonly isFull: boolean;
}

export const WorkerPool = function (options?: WorkerPoolOptions): {
  new (options?: WorkerPoolOptions): WorkerPool;
} {
  // deno-lint-ignore no-explicit-any
  return workerPool(options) as any;
} as unknown as {
  new (options?: WorkerPoolOptions): WorkerPool;
};

export function workerPool(options?: WorkerPoolOptions): WorkerPool {
  const { maxConcurrency, maxQueueLength } = fromOptions(options);
  const max_concurrency = maxConcurrency;
  const max_queue_length = maxQueueLength;
  const queue = new Queue<Task>();
  const onShutdownResolve = (() => {
    const deferred = new Deferred<void>();
    return {
      promise: deferred.promise,
      resolve: () => {
        state = 2;
        deferred.resolve();
      },
    };
  })();

  let state: 0 | 1 | 2 = 0;
  let active = 0;

  const pool = {
    submit(runnable: Task): void {
      if (!pool.trySubmit(runnable)) {
        throw new QueueLengthExceededError(
          "Worker pool is max queue length reached",
        );
      }
    },

    trySubmit(runnable: Task): boolean {
      if (!runnable) {
        throw new ArgumentNilError("Runnable is null or undefined");
      }

      if (state > 0) {
        throw new ShutdownError(
          "Cannot submit, pool is shutdown or terminated",
        );
      }

      if (queue.size >= max_queue_length) {
        return false;
      }

      queue.enqueue(runnable);
      runNext();

      return true;
    },

    onShutdown(): Promise<void> {
      return onShutdownResolve.promise;
    },

    shutdown(): void {
      if (this.isShutdownInitiated) {
        return;
      }

      state = 1;
      if (active === 0 && queue.isEmpty) {
        onShutdownResolve.resolve();
      }
    },

    shutdownNow(): Task[] {
      if (pool.isShutdown) {
        return [];
      }

      const remaining = queue.toArray();
      onShutdownResolve.resolve();

      return remaining;
    },

    get isShutdownInitiated() {
      return state > 0;
    },

    get isShutdown() {
      return state === 2;
    },

    get isFull() {
      return queue.size >= max_queue_length;
    },
  };

  async function runNext(): Promise<void> {
    while (active < max_concurrency && !queue.isEmpty) {
      const runnable = queue.dequeue()!;
      active++;
      try {
        await runnable();
      } catch (err) {
        console.error("Runnable failed", err);
      }
      active--;
    }

    if (
      pool.isShutdownInitiated &&
      active === 0 &&
      queue.isEmpty
    ) {
      onShutdownResolve.resolve();
    }
  }

  return pool;
}
