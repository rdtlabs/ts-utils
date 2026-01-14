import { CancellationInput } from "../../cancellation/cancellationInput.ts";
import type { CancellationToken } from "../../cancellation/CancellationToken.ts";
import { DeadlineExceededError } from "../../deadline.ts";
import type { Callable } from "../../types.ts";
import type { Executor } from "../executor.ts";
import { executors } from "../executors.ts";
import {
  type RateCostCalculator,
  type RateLimit,
  type RateLimiterSettings,
  RateLimitExceeded,
} from "./rate.limit.ts";
import { type TokenBucket, tokenBucket } from "./TokenBucket.ts";

/**
 * An executor that enforces rate limits on operations using token bucket algorithm.
 * Throws RateLimitExceeded when limits are exceeded, allowing callers to handle backoff.
 *
 * @example
 * ```ts
 * const limiter = RateLimiter({
 *   limits: [RateLimit.fixed(10, 1000)] // 10 ops/second
 * });
 *
 * try {
 *   await limiter.execute(() => fetchData());
 * } catch (e) {
 *   if (e instanceof RateLimitExceeded) {
 *     await sleep(e.retryAfter);
 *   }
 * }
 * ```
 */
export type RateLimiter = {
  /**
   * Executes a callable if rate limits allow, otherwise throws RateLimitExceeded.
   *
   * @param callable - The function to execute
   * @param deadline - Optional cancellation input (CancellationToken, Deadline, AbortSignal, etc.)
   * @returns The result of the callable
   * @throws RateLimitExceeded if the rate limit is exceeded (includes retryAfter time)
   * @throws DeadlineExceededError if the deadline/cancellation is triggered
   */
  execute<T>(
    callable: Callable<T | PromiseLike<T>>,
    deadline?: CancellationInput,
  ): Promise<T>;
};

/**
 * Creates a new RateLimiter instance with the specified rate limits.
 *
 * Supports multiple simultaneous rate limits (e.g., per-second AND per-minute limits).
 * All limits must be satisfied for an operation to proceed.
 *
 * @param settings - Configuration including rate limits and optional executor
 * @returns A new RateLimiter instance
 *
 * @example
 * ```ts
 * // Simple fixed rate limit
 * const limiter = RateLimiter({
 *   limits: [RateLimit.fixed(100, 1000)] // 100 ops/second
 * });
 *
 * // Multiple limits (burst + sustained)
 * const burstLimiter = RateLimiter({
 *   limits: [
 *     RateLimit.fixed(10, 1000),   // 10/second
 *     RateLimit.fixed(100, 60000)  // 100/minute
 *   ]
 * });
 *
 * // Variable cost based on operation
 * const variableLimiter = RateLimiter({
 *   limits: [RateLimit.variable(1000, {
 *     getCost: (fn) => estimateCost(fn)
 *   }, 1000)]
 * });
 * ```
 */
export const RateLimiter = function (settings: RateLimiterSettings) {
  // deno-lint-ignore no-explicit-any
  return rateLimiter(settings) as any;
} as unknown as {
  new (): RateLimiter;
};

/**
 * Creates a RateLimiter with the specified settings.
 *
 * The rate limiter uses token bucket algorithm(s) to enforce limits.
 * When multiple limits are specified, all must be satisfied.
 * If any limit fails, tokens consumed from other buckets are returned.
 *
 * @param settings - Configuration including rate limits and optional executor
 * @returns A configured RateLimiter instance
 * @throws Error if no limits are specified
 *
 * @example
 * ```ts
 * const limiter = rateLimiter({
 *   executor: executors.sequential(),
 *   limits: [RateLimit.fixed(5, 1000)]
 * });
 *
 * const result = await limiter.execute(async () => {
 *   return await callExternalApi();
 * });
 * ```
 */
export function rateLimiter(
  settings: RateLimiterSettings,
): RateLimiter {
  const executor: Executor = settings?.executor ?? executors.immediate;
  const consumeOrGetDelay = combine(settings.limits);

  function run<T>(
    fn: Callable<T | PromiseLike<T>>,
    deadline?: CancellationToken,
  ): Promise<T> {
    return executor.execute(fn, deadline);
  }

  return Object.seal({
    async execute<T>(
      callable: Callable<T | PromiseLike<T>>,
      deadline?: CancellationInput,
    ): Promise<T> {
      const cancellation = CancellationInput.of(deadline);
      if (cancellation?.isCancelled === true) {
        throw new DeadlineExceededError();
      }

      const delayMillis = consumeOrGetDelay(callable);
      if (delayMillis > 0) {
        throw new RateLimitExceeded(delayMillis);
      }

      return await run(callable, cancellation);
    },
  });
}

function convertLimits(
  limit: RateLimit,
): TokenBucket & RateCostCalculator {
  const calc = limit.type === "fixed"
    ? DEFAULT_COST_CALCULATOR
    : limit.costCalculator;
  const bucket = tokenBucket(limit.rate, limit.interval ?? 1000);
  return {
    getCost: calc.getCost,
    consumeTokens: bucket.consumeTokens,
    returnTokens: bucket.returnTokens,
    getTimeUntilConsumable: bucket.getTimeUntilConsumable,
  };
}

function combine(
  limits: RateLimit[],
): (callable: Callable<unknown>) => number {
  if (!limits || limits.length === 0) {
    throw new Error("At least one limit must be specified");
  }

  const converted = limits.map((limit) => convertLimits(limit));
  if (converted.length === 1) {
    const bucket = converted[0];
    return (callable) => {
      const cost = bucket.getCost(callable);
      return bucket.consumeTokens(cost)
        ? 0
        : bucket.getTimeUntilConsumable(cost);
    };
  }

  if (converted.length === 2) {
    const bucket1 = converted[0];
    const bucket2 = converted[1];
    return (callable) => {
      const cost1 = bucket1.getCost(callable);
      const cost2 = bucket2.getCost(callable);
      if (bucket1.consumeTokens(cost1)) {
        if (bucket2.consumeTokens(cost2)) {
          return 0;
        }
        bucket1.returnTokens(cost1);
        return bucket2.getTimeUntilConsumable(cost2);
      }

      if (bucket2.consumeTokens(cost2)) {
        bucket2.returnTokens(cost2);
        return bucket1.getTimeUntilConsumable(cost1);
      }

      return Math.max(
        bucket1.getTimeUntilConsumable(cost1),
        bucket2.getTimeUntilConsumable(cost2),
      );
    };
  }

  const consumed: number[] = converted.map(() => 0);
  return (callable) => {
    let delay = 0;
    for (let i = 0; i < converted.length; i++) {
      const bucket = converted[i];
      const cost = bucket.getCost(callable);
      if (bucket.consumeTokens(cost)) {
        consumed[i] = cost;
        continue;
      }

      const bucketDelay = bucket.getTimeUntilConsumable(cost);
      if (bucketDelay > delay) {
        delay = bucketDelay;
      }
    }

    if (delay > 0) {
      for (let i = 0; i < converted.length; i++) {
        const bucket = converted[i];
        if (consumed[i] > 0) {
          bucket.returnTokens(consumed[i]);
        }
        consumed[i] = 0;
      }
    }

    return delay;
  };
}

const DEFAULT_COST_CALCULATOR: RateCostCalculator = {
  getCost: (): number => 1,
};
