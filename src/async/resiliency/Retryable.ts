import { rateLimiter } from "./RateLimiter.ts";
import type { RateLimiterSettings, RetryableSettings } from "./rate.limit.ts";
import type { Executor } from "../executor.ts";
import type { Callable, ErrorLike } from "../../types.ts";
import { Deadline, DeadlineExceededError } from "../../deadline.ts";
import { calculateExponentialDelay, delayWithDeadline } from "../delay.ts";
import { Errors } from "../../errors/errors.ts";
import { Cancellable } from "../../cancellation/Cancellable.ts";
import { NonRetryableError, RetryableError } from "../../errors/error.types.ts";
import { executors } from "../executors.ts";

/**
 * An executor that automatically retries failed operations with exponential backoff.
 * Retries only occur for transient errors; non-retryable errors are thrown immediately.
 *
 * @example
 * ```ts
 * const retry = Retryable(); // Default: 3 retries, 30s max delay
 *
 * const result = await retry.execute(async () => {
 *   return await fetchData();
 * }, Deadline.after(5000));
 * ```
 */
export type Retryable = {
  /**
   * Executes a callable with automatic retry on transient errors.
   *
   * @param callable - The function to execute
   * @param deadline - Optional deadline for the entire operation including retries
   * @returns The result of the callable
   * @throws NonRetryableError if max retries exceeded or error is not transient
   * @throws DeadlineExceededError if the deadline is exceeded
   */
  execute<T>(
    callable: Callable<T | PromiseLike<T>>,
    deadline?: Deadline,
  ): Promise<T>;
};

/**
 * Creates a new Retryable instance with configurable retry behavior.
 *
 * @param settings - Optional configuration for retry behavior
 * @returns A new Retryable instance
 *
 * @example
 * ```ts
 * // Create with default settings
 * const retry = Retryable();
 *
 * // Create with custom settings
 * const customRetry = retryable({
 *   maxRetries: 5,
 *   maxDelay: 10000,
 *   nextDelayCalc: (attempt) => attempt * 1000
 * });
 *
 * // Use static instance for no-retry execution
 * const result = await Retryable.NONE.execute(myFn);
 * ```
 */
export const Retryable = function () {
  // deno-lint-ignore no-explicit-any
  return retryable() as any;
} as unknown as {
  new (): Retryable;
} & {
  /** A Retryable that performs no retries - executes once and throws on any error */
  NONE: Retryable;
};

/**
 * A Retryable instance that does not retry.
 * Executes the callable exactly once and throws any error immediately.
 */
Retryable.NONE = Object.seal({
  execute<T>(
    callable: Callable<T | PromiseLike<T>>,
    deadline?: Deadline,
  ): Promise<T> {
    return executors.immediate.execute(
      callable,
      deadline === undefined ? undefined : Cancellable.timeout(deadline),
    );
  },
});

Object.seal(Retryable);

/**
 * Creates a Retryable instance with configurable retry behavior.
 *
 * Uses exponential backoff by default and automatically detects transient errors.
 * Supports integration with rate limiters to avoid overwhelming services.
 *
 * @param settings - Optional configuration for retry behavior
 * @returns A configured Retryable instance
 * @throws Error if maxRetries or maxDelay is not positive
 *
 * @example
 * ```ts
 * // Simple usage with defaults
 * const retry = retryable();
 *
 * // With rate limiting
 * const rateLimited = retryable({
 *   rateLimiterOrExecutor: {
 *     limits: [RateLimit.fixed(10, 1000)]
 *   },
 *   maxRetries: 5
 * });
 *
 * // Custom error detection
 * const customRetry = retryable({
 *   errorHelper: {
 *     isTransient: (err) => err.code === 'ECONNRESET'
 *   }
 * });
 *
 * const result = await retry.execute(() => fetchData());
 * ```
 */
export function retryable(settings?: RetryableSettings): Retryable {
  const maxDelay = settings?.maxDelay ?? 30000;
  const maxRetries = settings?.maxRetries ?? 3;
  const executor = resolveSettingsOrExecutor(
    settings?.rateLimiterOrExecutor,
  );
  const nextDelayCalc = settings?.nextDelayCalc ?? calculateExponentialDelay;
  const errorHelper = settings?.errorHelper ?? {
    isTransient: (error) => Errors.isTransient(error),
  };

  if (maxRetries <= 0) {
    throw new Error("maxRetries must be a positive number");
  }

  if (maxDelay <= 0) {
    throw new Error("maxDelay must be a positive number");
  }

  function getNextDelayCalcWithError(retries: number, err: unknown): number {
    if (err instanceof RetryableError && err.retryAfter) {
      return err.retryAfter;
    }
    return nextDelayCalc(retries);
  }
  return Object.seal({
    async execute<T>(
      callable: Callable<T | PromiseLike<T>>,
      deadline?: Deadline,
    ): Promise<T> {
      if (deadline?.isExpired === true) {
        throw new DeadlineExceededError();
      }

      let retries = 0;
      let lastError: unknown = undefined;

      deadline = (deadline?.remainingMillis ?? 0) <= maxDelay
        ? deadline
        : Deadline.after(maxDelay);

      do {
        if (retries > 0) {
          // eslint-disable-next-line no-await-in-loop
          await delayWithDeadline(
            getNextDelayCalcWithError(retries, lastError),
            deadline,
          );
        }

        try {
          // eslint-disable-next-line no-await-in-loop
          return await executor.execute(callable, deadline);
        } catch (err) {
          lastError = err;

          if (!errorHelper.isTransient(err as ErrorLike)) {
            throw err;
          }

          retries++;
        }
      } while (retries < maxRetries);

      throw new NonRetryableError(lastError);
    },
  });
}

function resolveSettingsOrExecutor(
  rateLimiterOrExecutor?: RateLimiterSettings | Executor,
): Executor {
  if (!rateLimiterOrExecutor) {
    return executors.immediate;
  }

  if ("execute" in rateLimiterOrExecutor) {
    return rateLimiterOrExecutor;
  }

  return rateLimiter(rateLimiterOrExecutor) as Executor;
}
