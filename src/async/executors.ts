import type { Callable, ErrorLike } from "../types.ts";
import type { CancellationToken } from "../cancellation/CancellationToken.ts";
import { JobPool } from "./JobPool.ts";
import { Promises } from "./Promises.ts";
import type { ConcurrentExecutor, Executor } from "./executor.ts";
import { Errors } from "../errors/errors.ts";

/**
 * A collection of utility functions for working with executors.
 */
export const executors = Object.freeze({
  concurrent: (maxConcurrency, maxQueueLength) => {
    const pool = new JobPool({
      maxConcurrency: maxConcurrency ?? 4,
      maxQueueLength: maxQueueLength ?? 1024,
    });
    return {
      execute: <T>(
        callable: Callable<T | PromiseLike<T>>,
        deadline?: CancellationToken,
      ) => {
        return pool.submit(callable, deadline);
      },
      shutdown: () => pool.shutdown(),
      onShutdown: () => pool.onShutdown(),
      get isShutdownInitiated() {
        return pool.isShutdownInitiated;
      },
      get isShutdown() {
        return pool.isShutdown;
      },
    };
  },

  sequential: () => {
    let lastPromise: Promise<unknown> = Promise.resolve();
    return {
      execute: (callable, deadline) => {
        // Create the new task promise
        const taskPromise = new Promise((resolve, reject) => {
          // Chain after the last promise, but use then/catch instead of finally
          // to properly handle both success and failure cases
          lastPromise = lastPromise.then(
            () => __invoke(callable, resolve, reject, deadline),
            () => __invoke(callable, resolve, reject, deadline),
          );
        });

        // Update lastPromise to the current task so it completes before the next one
        // This prevents the chain from growing indefinitely
        lastPromise = taskPromise.catch(() => {
          // Swallow errors here since they're already handled in taskPromise
          // This prevents unhandled rejection warnings
        });

        return taskPromise;
      },
    } as Executor;
  },

  sequentialize: (executor) => {
    const sequential = executors.sequential();
    return {
      execute: (callable, deadline) => {
        return sequential.execute(
          () => executor.execute(callable, deadline),
        );
      },
    };
  },

  immediate: <Executor> {
    execute: (callable, cancellation) => {
      return executors.invoke(callable, cancellation);
    },
  },

  macro: <Executor> {
    execute: <T>(
      callable: Callable<T | PromiseLike<T>>,
      cancellation?: CancellationToken,
    ) => {
      return new Promise<T>((resolve, reject) => {
        setTimeout(
          () => __invoke(callable, resolve, reject, cancellation),
          0,
        );
      });
    },
  },

  micro: <Executor> {
    execute: <T>(
      callable: Callable<T | PromiseLike<T>>,
      cancellation?: CancellationToken,
    ) => {
      return new Promise<T>((resolve, reject) => {
        queueMicrotask(() => __invoke(callable, resolve, reject, cancellation));
      });
    },
  },

  invoke: (callable, cancellation) => {
    try {
      return Promises.cancellable(
        Promise.resolve(callable()),
        cancellation,
      );
    } catch (error) {
      return Promises.reject(error);
    }
  },

  invokeOn: (callable, executor, cancellation) => {
    return __invokeOn(callable, executor ?? executors.immediate, cancellation);
  },
}) as {
  /**
   * @param maxConcurrency The maximum number of tasks that can be executed concurrently. Defaults to 4.
   * @param maxQueueLength The maximum number of tasks that can be queued. Defaults to 1024.
   * @returns An executor that uses a pool of workers to execute tasks concurrently.
   */
  concurrent: (
    maxConcurrency: number,
    maxQueueLength?: number,
  ) => ConcurrentExecutor;

  /**
   * @returns An executor that executes tasks sequentially.
   */
  sequential: () => Executor;

  /**
   * @returns An executor that executes tasks sequentially using the given executor.
   */
  sequentialize: (executor: Executor) => Executor;

  /**
   * @returns An executor that is synchronous.
   */
  immediate: Executor;

  /**
   * @returns An executor that uses `setTimeout(fn, 0)` to schedule tasks.
   */
  macro: Executor;

  /**
   * @returns An executor that uses `queueMicrotask` to schedule tasks.
   * @see https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/queueMicrotask
   */
  micro: Executor;

  /**
   * @returns A promise that resolves with the result of the callable or rejects with an error.
   */
  invoke: <T>(
    callable: Callable<T | PromiseLike<T>>,
    cancellation?: CancellationToken,
  ) => Promise<T>;

  /**
   * @returns A promise that resolves with the result of the callable or rejects with an error.
   */
  invokeOn: <T>(
    callable: Callable<T | PromiseLike<T>>,
    executor?: Executor,
    deadline?: CancellationToken,
  ) => Promise<T>;
};

const __invoke = <T = void>(
  callable: Callable<T | PromiseLike<T>>,
  resolve: (value: T | PromiseLike<T>) => void,
  reject: (reason: ErrorLike) => void,
  deadline?: CancellationToken,
): void => {
  try {
    const result = callable();
    // Only wrap in Promise.resolve if result is not already a Promise
    // This avoids an extra microtask tick
    const promise = result instanceof Promise
      ? result
      : Promise.resolve(result);

    // Handle the promise resolution - no need to return since we're using callbacks
    Promises
      .cancellable(promise, deadline)
      .then(resolve, (error) => {
        // Use second parameter of then() instead of catch() to avoid creating another microtask
        reject(Errors.resolve(error));
      });
  } catch (error) {
    reject(Errors.resolve(error));
  }
};

function __invokeOn<T>(
  callable: Callable<T | PromiseLike<T>>,
  executor: Executor,
  cancellation?: CancellationToken,
): Promise<T> {
  // Execute the callable on the executor and return its promise directly
  // The executor.execute() already handles the promise resolution/rejection
  return executor.execute(
    () => executors.invoke(callable, cancellation),
    cancellation,
  );
}
