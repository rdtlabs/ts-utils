import type { ErrorLike } from "../../types.ts";
import type { Executor } from "../executor.ts";

/**
 * Configuration settings for a Retryable instance.
 *
 * @property rateLimiterOrExecutor - Optional rate limiter settings or executor to use for execution
 * @property maxRetries - Maximum number of retry attempts (default: 3)
 * @property nextDelayCalc - Function to calculate delay before next retry based on attempt number
 * @property errorHelper - Object with isTransient method to determine if an error is retryable
 * @property maxDelay - Maximum delay in milliseconds between retries (default: 30000)
 */
export type RetryableSettings = {
  rateLimiterOrExecutor?: RateLimiterSettings | Executor;
  maxRetries?: number;
  nextDelayCalc?: (attempt: number) => number;
  errorHelper?: { isTransient: (error: ErrorLike) => boolean };
  maxDelay?: number;
};

/**
 * Calculator for determining the cost of a callable operation in terms of tokens.
 * Used with variable rate limits to assign different costs to different operations.
 */
export type RateCostCalculator = {
  /**
   * Calculates the token cost for executing the given callable.
   * @param callable - The function to calculate cost for
   * @returns The number of tokens this operation will consume
   */
  getCost(callable: () => unknown): number;
};

/**
 * Configuration for a rate limit. Can be either fixed (1 token per call) or
 * variable (cost determined by RateCostCalculator).
 *
 * @property type - "fixed" for constant cost per call, "variable" for dynamic cost
 * @property rate - Maximum number of tokens available per interval
 * @property interval - Time window in milliseconds for token replenishment (default: 1000)
 * @property costCalculator - Required for variable type; calculates token cost per operation
 */
export type RateLimit = {
  type: "fixed";
  rate: number;
  interval?: number;
} | {
  type: "variable";
  rate: number;
  interval?: number;
  costCalculator: RateCostCalculator;
};

/**
 * Configuration settings for a RateLimiter instance.
 *
 * @property executor - Optional executor for running rate-limited operations
 * @property limits - Array of rate limits to apply (all must be satisfied)
 */
export type RateLimiterSettings = {
  executor?: Executor;
  limits: RateLimit[];
};

/**
 * Factory object for creating RateLimit configurations.
 */
export const RateLimit = {
  /**
   * Creates a fixed rate limit where each operation costs 1 token.
   *
   * @param rate - Maximum number of operations allowed per interval
   * @param interval - Time window in milliseconds (default: 1000)
   * @returns A fixed RateLimit configuration
   *
   * @example
   * ```ts
   * // Allow 10 operations per second
   * const limit = RateLimit.fixed(10, 1000);
   * ```
   */
  fixed: (rate: number, interval?: number): RateLimit => {
    return {
      type: "fixed",
      rate,
      interval,
    };
  },

  /**
   * Creates a variable rate limit where operation cost is determined by a calculator.
   *
   * @param rate - Maximum number of tokens available per interval
   * @param costCalculator - Calculator to determine token cost per operation
   * @param interval - Time window in milliseconds (default: 1000)
   * @returns A variable RateLimit configuration
   *
   * @example
   * ```ts
   * // Variable cost based on operation type
   * const limit = RateLimit.variable(100, {
   *   getCost: (callable) => callable.toString().includes('heavy') ? 10 : 1
   * }, 1000);
   * ```
   */
  variable: (
    rate: number,
    costCalculator: RateCostCalculator,
    interval?: number,
  ): RateLimit => {
    return {
      type: "variable",
      rate,
      interval,
      costCalculator,
    };
  },
};

/**
 * Error thrown when a rate limit is exceeded.
 * Contains information about when the operation can be retried.
 *
 * @example
 * ```ts
 * try {
 *   await rateLimiter.execute(myOperation);
 * } catch (e) {
 *   if (e instanceof RateLimitExceeded) {
 *     console.log(`Retry after ${e.retryAfter}ms`);
 *   }
 * }
 * ```
 */
export class RateLimitExceeded extends Error {
  /**
   * Creates a new RateLimitExceeded error.
   * @param retryAfter - Time in milliseconds until the operation can be retried
   */
  public constructor(retryAfter?: number) {
    super("RateLimitExceeded");
    this.retryAfter = retryAfter;
  }

  /** Indicates this error is retryable after waiting */
  public readonly isRetryable = true;

  /** Time in milliseconds until the operation can be retried */
  public readonly retryAfter?: number;
}
