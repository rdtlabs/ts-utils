import type { Callable } from "../types.ts";
import { WorkerPool } from "./workerpool/WorkerPool.ts";
import { deferred } from "./Deferred.ts";
import type { CancellationToken } from "../cancellation/CancellationToken.ts";
import { Promises } from "./Promises.ts";

export type Job<T> = Callable<PromiseLike<T> | T>;

/**
 * Represents a pool of jobs that can be submitted and executed asynchronously.
 */
export interface JobPool {
  /**
   * Submits a job to the pool for execution.
   * @param job The job to be executed.
   * @param cancellation An optional cancellation token to cancel the job.
   * @returns A promise that resolves to the result of the job execution.
   */
  submit<T = void>(job: Job<T>, cancellation?: CancellationToken): Promise<T>;

  /**
   * Initiates the shutdown of the job pool.
   * Once shutdown is initiated, no new jobs can be submitted.
   */
  shutdown(): void;

  /**
   * Returns a promise that resolves when the shutdown process is complete.
   * This includes the completion of all pending jobs.
   * @returns A promise that resolves when the shutdown process is complete.
   */
  onShutdown(): Promise<void>;

  /**
   * Immediately shuts down the job pool and returns a list of pending jobs.
   * @returns An array of pending jobs that were not executed.
   */
  shutdownNow(): Job<unknown>[];

  /**
   * Indicates whether the shutdown process has been initiated.
   */
  readonly isShutdownInitiated: boolean;

  /**
   * Indicates whether the job pool has been fully shut down.
   */
  readonly isShutdown: boolean;

  /**
   * Indicates whether the job pool is currently full and cannot accept new jobs.
   */
  readonly isFull: boolean;

  /**
   * Disposes the job pool and releases any resources associated with it.
   */
  [Symbol.dispose](): void;
}

/**
 * Creates a job pool with the specified options.
 *
 * @param options - The options for the job pool.
 * @returns The job pool object.
 */
export const JobPool = function (options?: {
  maxConcurrency?: number;
  maxQueueLength?: number;
}): JobPool {
  return jobPool(options);
} as unknown as {
  new (options?: {
    maxConcurrency?: number;
    maxQueueLength?: number;
  }): JobPool;
};

/**
 * Creates a job pool with the specified options.
 *
 * @param options - The options for the job pool.
 * @returns The job pool object.
 */
export function jobPool(options?: {
  maxConcurrency?: number;
  maxQueueLength?: number;
}): JobPool {
  const pool = new WorkerPool(options);
  const jobPool = {
    onShutdown: () => pool.onShutdown(),
    shutdown: () => pool.shutdown(),
    // deno-lint-ignore no-explicit-any
    shutdownNow: () => pool.shutdownNow().map((task) => (task as any).job),
    [Symbol.dispose]: () => {
      pool.shutdownNow();
    },
    get isShutdownInitiated() {
      return pool.isShutdownInitiated;
    },
    get isShutdown() {
      return pool.isShutdown;
    },
    get isFull() {
      return pool.isFull;
    },
    submit: <T>(job: Job<T>, cancellation?: CancellationToken) => {
      const controller = deferred<T>();
      const wrapped = wrap(job, cancellation);
      pool.submit(
        Object.assign(
          async () => {
            try {
              controller.resolve(await wrapped());
            } catch (error) {
              controller.reject(error);
            }
          },
          { job },
        ),
      );
      return controller.promise;
    },
  };

  return jobPool;
}

function wrap<T>(
  job: Job<T>,
  cancellation?: CancellationToken,
): Job<T> {
  return !cancellation ? job : () => {
    return Promises.cancellable(
      async () => await job(),
      cancellation,
    );
  };
}
