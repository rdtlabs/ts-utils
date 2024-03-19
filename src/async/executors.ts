import { type Callable, type TimeoutInput } from "../common/types.ts";
import { type ErrorLike } from "../common/types.ts";
import { type CancellationToken } from "../cancellation/CancellationToken.ts";
import cancellationRace from "../cancellation/cancellationRace.ts";
import { JobPool } from "./JobPool.ts";

export const Executor = Object.freeze({
  concurrent: (
    maxConcurrency: number,
    maxQueueLength = 1024,
  ): ConcurrentExecutor => {
    const pool = new JobPool({ maxConcurrency, maxQueueLength });
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
  sequential: (): Executor => {
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
  sequentialize: (executor: Executor): Executor => {
    const sequential = Executor.sequential();
    return {
      execute: (callable, deadline) => {
        return sequential.execute(
          () => executor.execute(callable, deadline),
        );
      },
    };
  },
  immediate: <Executor> {
    execute: <T>(
      callable: Callable<T | PromiseLike<T>>,
      cancellation?: TimeoutInput | CancellationToken,
    ): Promise<T> => {
      return Executor.invoke(callable, cancellation);
    },
  },
  /**
   * @returns An executor that uses `setTimeout(fn, 0)` to schedule tasks.
   */
  task: <T>(
    callable: Callable<T | PromiseLike<T>>,
    cancellation?: TimeoutInput | CancellationToken,
  ) => {
    return new Promise((resolve, reject) => {
      setTimeout(
        // deno-lint-ignore no-explicit-any
        () => __invoke<T>(callable, resolve as any, reject, cancellation),
        0,
      );
    });
  },
  /**
   * @returns An executor that uses `queueMicrotask` to schedule tasks.
   */
  micro: <T>(
    callable: Callable<T | PromiseLike<T>>,
    cancellation?: TimeoutInput | CancellationToken,
  ) => {
    return new Promise((resolve, reject) => {
      queueMicrotask(() =>
        // deno-lint-ignore no-explicit-any
        __invoke<T>(callable, resolve as any, reject, cancellation)
      );
    });
  },
  invoke: <T>(
    callable: Callable<T | PromiseLike<T>>,
    cancellation?: TimeoutInput | CancellationToken,
  ) => {
    try {
      return cancellationRace(
        Promise.resolve(callable()),
        cancellation,
      );
    } catch (error) {
      return Promise.reject<T>(error);
    }
  },
  invokeOn: <T>(
    callable: Callable<T | PromiseLike<T>>,
    executor?: Executor,
    deadline?: TimeoutInput | CancellationToken,
  ) => {
    return __invokeOn(callable, executor ??= Executor.immediate, deadline);
  },
});

export type Executor = {
  execute: <T>(
    callable: Callable<T | PromiseLike<T>>,
    deadline?: TimeoutInput | CancellationToken,
  ) => Promise<T>;
};

const __invoke = <T = void>(
  callable: Callable<T | PromiseLike<T>>,
  resolve: (value: T | PromiseLike<T>) => void,
  reject: (reason: ErrorLike) => void,
  deadline?: TimeoutInput | CancellationToken,
) => {
  try {
    const result = Promise.resolve(callable());
    return resolve(cancellationRace(result, deadline));
  } catch (error) {
    return reject(error);
  }
};

function __invokeOn<T>(
  callable: Callable<T | PromiseLike<T>>,
  executor: Executor,
  deadline?: TimeoutInput | CancellationToken,
) {
  return new Promise<unknown>((resolve, reject) => {
    try {
      executor
        .execute(() => __invoke(callable, resolve, reject, deadline))
        .then((result) => resolve(result))
        .catch((error) => reject(error));
    } catch (error) {
      reject(error); // in case execute throws an error
    }
  });
}

export type ConcurrentExecutor = {
  execute: <T>(
    callable: Callable<T | PromiseLike<T>>,
    deadline?: TimeoutInput | CancellationToken,
  ) => Promise<T>;

  shutdown(): void;
  onShutdown(): Promise<void>;
  readonly isShutdownInitiated: boolean;
  readonly isShutdown: boolean;
};
