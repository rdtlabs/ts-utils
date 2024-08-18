import type { CancellationToken } from "../cancellation/CancellationToken.ts";
import type { Callable, TimeoutInput } from "../types.ts";
import { delay } from "./delay.ts";
import type { Executor } from "./executor.ts";
import { executors } from "./executors.ts";

/**
 * Utility object for working with asynchronous tasks.
 */
export const Task: __TaskStatic = Object.freeze({
  /**
   * Runs a task asynchronously and returns a promise that resolves to the result of the task.
   *
   * @template T - The type of the result returned by the task.
   * @param {Callable<T | PromiseLike<T>>} task - The task to be executed.
   * @param {Object} [options] - Optional parameters for task execution.
   * @param {CancellationToken} [options.cancellation] - A cancellation token that can be used to cancel the task.
   * @param {("micro" | "macro" | "sync" | Executor)} [options.scheduler] - The scheduler to be used for task execution.
   * @returns {Promise<T>} - A promise that resolves to the result of the task.
   */
  run<T = void>(
    task: Callable<T | PromiseLike<T>>,
    options?: {
      cancellation?: CancellationToken;
      scheduler?: "micro" | "macro" | "sync" | Executor;
    },
  ): Promise<T> {
    const scheduler = getScheduler(options?.scheduler);
    return scheduler.execute(task, options?.cancellation);
  },

  /**
   * Runs a task after a specified timeout, with optional cancellation support.
   * @param task - The task to run.
   * @param timeoutInput - The timeout duration or a timeout configuration object.
   * @param cancellation - Optional cancellation token to cancel the task.
   * @returns A promise that resolves to the result of the task, with a `dispose` method for cancellation.
   */
  runAfter<T = void>(
    task: Callable<T | PromiseLike<T>>,
    timeoutInput: TimeoutInput,
    cancellation?: CancellationToken,
  ): Promise<T> & Disposable {
    const timer = delay(timeoutInput, cancellation);
    const promise = timer.then(task);
    return Object.defineProperty(promise, Symbol.dispose, {
      value: () => {
        timer[Symbol.dispose]();
      },
    }) as Promise<T> & Disposable;
  },

  /**
   * Delayed promise utility function.
   * @param timeoutInput - The amount of time to delay, in milliseconds.
   * @param cancellation - An optional CancellationToken to cancel the delay.
   * @returns A Promise that resolves after the specified delay time.
   */
  delay(
    timeoutInput: TimeoutInput,
    cancellation?: CancellationToken,
  ): Promise<void> & Disposable {
    return delay(timeoutInput, cancellation);
  },
});

function getScheduler(
  scheduler: "micro" | "macro" | "sync" | Executor | undefined,
): Executor {
  if (!scheduler || scheduler === "sync") {
    return executors.immediate;
  }

  if (scheduler === "micro") {
    return executors.micro;
  }

  if (scheduler === "macro") {
    return executors.macro;
  }

  if (typeof scheduler === "object") {
    return scheduler;
  }

  throw new TypeError("Invalid argument");
}

/* https://jsr.io/docs/about-slow-types#explicit-types */
type __TaskStatic = {
  run: <T>(
    task: Callable<T | PromiseLike<T>>,
    options?: {
      cancellation?: CancellationToken;
      scheduler?: "micro" | "macro" | "sync" | Executor;
    },
  ) => Promise<T>;
  runAfter: <T>(
    task: Callable<T | PromiseLike<T>>,
    timeoutInput: TimeoutInput,
    cancellation?: CancellationToken,
  ) => Promise<T> & Disposable;
  delay: (
    timeoutInput: TimeoutInput,
    cancellation?: CancellationToken,
  ) => Promise<void> & Disposable;
};
