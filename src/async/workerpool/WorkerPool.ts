import { Deferred } from "../Deferred.ts";
import { fromOptions } from "./_utils.ts";
import { Queue } from "../../Queue.ts";
import {
  ArgumentNilError,
  QueueLengthExceededError,
  ShutdownError,
} from "../../errors/error.types.ts";

type Task = () => Promise<void> | void;

/** Pool state constants for clarity */
const STATE_RUNNING = 0;
const STATE_SHUTTING_DOWN = 1;
const STATE_SHUTDOWN = 2;

type PoolState =
  | typeof STATE_RUNNING
  | typeof STATE_SHUTTING_DOWN
  | typeof STATE_SHUTDOWN;

export type WorkerPoolOptions = {
  /** Maximum number of concurrent tasks. Defaults to 4. */
  maxConcurrency?: number;
  /** Maximum queue length before rejecting new tasks. Defaults to 1024. */
  maxQueueLength?: number;
};

/**
 * Represents a worker pool that can execute tasks asynchronously.
 */
export interface WorkerPool {
  /**
   * Submits a task to be executed by the worker pool.
   * @param runnable The task to be executed.
   * @throws {QueueLengthExceededError} If the queue is full.
   * @throws {ShutdownError} If the pool is shutting down or shutdown.
   */
  submit(runnable: Task): void;

  /**
   * Tries to submit a task to the worker pool.
   * @param runnable The task to be submitted.
   * @returns A boolean indicating whether the task was successfully submitted.
   * @throws {ArgumentNilError} If runnable is null or undefined.
   * @throws {ShutdownError} If the pool is shutting down or shutdown.
   */
  trySubmit(runnable: Task): boolean;

  /**
   * Initiates the shutdown of the worker pool.
   * Existing tasks will complete, but no new tasks are accepted.
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
 * WorkerPool constructor function.
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
  const queue = new Queue<Task>();
  const shutdownDeferred = new Deferred<void>();

  let state: PoolState = STATE_RUNNING;
  let activeCount = 0;

  function completeShutdown(): void {
    if (state !== STATE_SHUTDOWN) {
      state = STATE_SHUTDOWN;
      shutdownDeferred.resolve();
    }
  }

  function tryCompleteShutdown(): void {
    if (state === STATE_SHUTTING_DOWN && activeCount === 0 && queue.isEmpty) {
      completeShutdown();
    }
  }

  async function runNext(): Promise<void> {
    while (activeCount < maxConcurrency && !queue.isEmpty) {
      const runnable = queue.dequeue()!;
      activeCount++;
      try {
        await runnable();
      } catch (err) {
        console.error("Runnable failed", err);
      }
      activeCount--;
    }

    tryCompleteShutdown();
  }

  const pool: WorkerPool = {
    submit(runnable: Task): void {
      if (!pool.trySubmit(runnable)) {
        throw new QueueLengthExceededError(
          "Worker pool max queue length reached",
        );
      }
    },

    trySubmit(runnable: Task): boolean {
      if (!runnable) {
        throw new ArgumentNilError("Runnable is null or undefined");
      }

      if (state !== STATE_RUNNING) {
        throw new ShutdownError(
          "Cannot submit, pool is shutdown or shutting down",
        );
      }

      if (queue.size >= maxQueueLength) {
        return false;
      }

      queue.enqueue(runnable);
      runNext();

      return true;
    },

    onShutdown(): Promise<void> {
      return shutdownDeferred.promise;
    },

    shutdown(): void {
      if (pool.isShutdownInitiated) {
        return;
      }

      state = STATE_SHUTTING_DOWN;
      tryCompleteShutdown();
    },

    shutdownNow(): Task[] {
      if (pool.isShutdown) {
        return [];
      }

      const remaining = queue.toArray();
      completeShutdown();

      return remaining;
    },

    get isShutdownInitiated(): boolean {
      return state !== STATE_RUNNING;
    },

    get isShutdown(): boolean {
      return state === STATE_SHUTDOWN;
    },

    get isFull(): boolean {
      return queue.size >= maxQueueLength;
    },
  };

  return pool;
}
