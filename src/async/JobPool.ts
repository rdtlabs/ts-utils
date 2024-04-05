import { type Callable } from "../types.ts";
import { WorkerPool } from "./workerpool/WorkerPool.ts";
import { deferred } from "./Deferred.ts";
import { type CancellationToken } from "../cancellation/CancellationToken.ts";
import { type TimeoutInput } from "../types.ts";
import { __isToken } from "../cancellation/_utils.ts";
import { cancellationRace } from "../cancellation/cancellationRace.ts";

export type Job<T> = Callable<PromiseLike<T> | T>;

export interface JobPool {
  submit<T = void>(job: Job<T>, cancellation?: CancellationToken): Promise<T>;
  submit<T = void>(job: Job<T>, deadline?: TimeoutInput): Promise<T>;

  shutdown(): void;
  onShutdown(): Promise<void>;
  shutdownNow(): Job<unknown>[];

  readonly isShutdownInitiated: boolean;
  readonly isShutdown: boolean;
  readonly isFull: boolean;

  [Symbol.dispose](): void;
}

export const JobPool = function (options?: {
  maxConcurrency?: number;
  maxQueueLength?: number;
}): JobPool {
  return jobPool(options);
} as unknown as {
  new(options?: {
    maxConcurrency?: number;
    maxQueueLength?: number;
  }): JobPool;
};

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
    submit: <T>(job: Job<T>, deadline?: CancellationToken | TimeoutInput) => {
      const controller = deferred<T>();
      const wrapped = wrap(job, deadline);
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
  cancellation?: TimeoutInput | CancellationToken,
): Job<T> {
  return !cancellation
    ? job
    : () => cancellationRace(() => Promise.resolve(job()), cancellation);
}
