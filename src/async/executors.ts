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
      execute: (callable, deadline) => {
        // deno-lint-ignore no-explicit-any
        return (pool as any).submit(callable, deadline);
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
    let lastPromise = Promise.resolve();
    return {
      execute: (callable, deadline) => {
        return new Promise((resolve, reject) => {
          lastPromise = lastPromise.finally(() =>
            __invoke(callable, resolve, reject, deadline)
          );
        });
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
    execute: (callable, cancellation) => {
      return new Promise((resolve, reject) => {
        setTimeout(
          // deno-lint-ignore no-explicit-any
          () => __invoke(callable, resolve as any, reject, cancellation),
          0,
        );
      });
    },
  },

  micro: <Executor> {
    execute: (callable, cancellation) => {
      return new Promise((resolve, reject) => {
        queueMicrotask(() =>
          // deno-lint-ignore no-explicit-any
          __invoke(callable, resolve as any, reject, cancellation)
        );
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
) => {
  try {
    const result = Promise.resolve(callable());
    resolve(Promises.cancellable(result, deadline));
  } catch (error) {
    reject(Errors.resolve(error));
  }
};

function __invokeOn<T>(
  callable: Callable<T | PromiseLike<T>>,
  executor: Executor,
  cancellation?: CancellationToken,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    executor
      .execute(() => __invoke(callable, resolve, reject, cancellation))
      .then((result) => resolve(result as T))
      .catch((e) => reject(Errors.resolve(e)));
  });
}
