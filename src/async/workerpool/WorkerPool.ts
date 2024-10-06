import { Deferred } from "../Deferred.ts";
import { fromOptions } from "./_utils.ts";
import { Queue } from "../../Queue.ts";
import {
  ArgumentNilError,
  QueueLengthExceededError,
  ShutdownError,
} from "../../errors/error.types.ts";

type Task = () => Promise<void> | void;

export type WorkerPoolOptions = {
  // defaults to 4
  maxConcurrency?: number;
  // defaults to Infinity
  maxQueueLength?: number;
};

/**
 * Represents a worker pool that can execute tasks asynchronously.
 */
export interface WorkerPool {
  /**
   * Submits a task to be executed by the worker pool.
   * @param runnable The task to be executed.
   */
  submit(runnable: Task): void;

  /**
   * Tries to submit a task to the worker pool.
   * @param runnable The task to be submitted.
   * @returns A boolean indicating whether the task was successfully submitted.
   */
  trySubmit(runnable: Task): boolean;

  /**
   * Initiates the shutdown of the worker pool.
   */
  shutdown(): void;

  /**
   * Returns a promise that resolves when the worker pool has completed its shutdown process.
   * @returns A promise that resolves when the shutdown process is complete.
   */
  onShutdown(): Promise<void>;

  /**
   * Shuts down the worker pool immediately and returns any pending tasks.
   * @returns An array of pending tasks that were not executed.
   */
  shutdownNow(): Task[];

  /**
   * Indicates whether the shutdown process has been initiated for the worker pool.
   */
  readonly isShutdownInitiated: boolean;

  /**
   * Indicates whether the worker pool has been shut down.
   */
  readonly isShutdown: boolean;

  /**
   * Indicates whether the worker pool is currently full and cannot accept new tasks.
   */
  readonly isFull: boolean;
}

/**
 * Creates a worker pool with the specified options.
 *
 * @param options - The options for the worker pool.
 * @returns The worker pool object.
 */

export const WorkerPool = function (options?: WorkerPoolOptions): {
  new (options?: WorkerPoolOptions): WorkerPool;
} {
  // deno-lint-ignore no-explicit-any
  return workerPool(options) as any;
} as unknown as {
  new (options?: WorkerPoolOptions): WorkerPool;
};

/**
 * Creates a worker pool with the specified options.
 *
 * @param options - The options for the worker pool.
 * @returns The worker pool object.
 */
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
