import type { Callable } from "../types.ts";
import type { CancellationToken } from "../cancellation/CancellationToken.ts";

/**
 * An abstraction for executing tasks.
 */
export interface Executor {
  /**
   * @param callable The task to execute.
   * @param deadline The deadline for the task to complete.
   * @returns A promise that resolves with the result of the callable or rejects with an error.
   */
  execute: <T>(
    callable: Callable<T | PromiseLike<T>>,
    deadline?: CancellationToken,
  ) => Promise<T>;
}

/**
 * An executor that executes tasks concurrently.
 */
export interface ConcurrentExecutor extends Executor {
  /**
   * Initiates an orderly shutdown in which previously submitted tasks are executed, but no new tasks will be accepted.
   * Invocation has no additional effect if already shut down.
   * @returns A promise that resolves when the executor has completed shutdown.
   */
  shutdown(): void;

  /**
   * Awaits completion of all tasks in the executor.
   * @returns A promise that resolves when the executor has completed shutdown.
   */
  onShutdown(): Promise<void>;

  /**
   * @returns `true` if the executor has initiated shutdown.
   */
  readonly isShutdownInitiated: boolean;

  /**
   * @returns `true` if the executor has completed shutdown.
   */
  readonly isShutdown: boolean;
}
