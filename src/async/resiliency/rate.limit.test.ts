import { assert, assertEquals } from "@std/assert";
import {
  RateLimit,
  RateLimitExceeded,
  type RateCostCalculator,
  type RateLimiterSettings,
  type RetryableSettings,
} from "./rate.limit.ts";

Deno.test("RateLimit.fixed creates fixed rate limit config", () => {
  const limit = RateLimit.fixed(10, 1000);

  assertEquals(limit.type, "fixed");
  assertEquals(limit.rate, 10);
  assertEquals(limit.interval, 1000);
});

Deno.test("RateLimit.fixed uses default interval when not provided", () => {
  const limit = RateLimit.fixed(5);

  assertEquals(limit.type, "fixed");
  assertEquals(limit.rate, 5);
  assertEquals(limit.interval, undefined);
});

Deno.test("RateLimit.variable creates variable rate limit config", () => {
  const costCalculator: RateCostCalculator = {
    getCost: () => 2,
  };

  const limit = RateLimit.variable(100, costCalculator, 2000);

  assertEquals(limit.type, "variable");
  assertEquals(limit.rate, 100);
  assertEquals(limit.interval, 2000);
  if (limit.type === "variable") {
    assertEquals(limit.costCalculator, costCalculator);
  }
});

Deno.test("RateLimit.variable uses default interval when not provided", () => {
  const costCalculator: RateCostCalculator = {
    getCost: () => 1,
  };

  const limit = RateLimit.variable(50, costCalculator);

  assertEquals(limit.type, "variable");
  assertEquals(limit.rate, 50);
  assertEquals(limit.interval, undefined);
});

Deno.test("RateCostCalculator getCost returns correct cost", () => {
  const costCalculator: RateCostCalculator = {
    getCost: (callable) => {
      const fnStr = callable.toString();
      return fnStr.includes("heavy") ? 10 : 1;
    },
  };

  const lightFn = () => "light";
  const heavyFn = () => "heavy operation";

  assertEquals(costCalculator.getCost(lightFn), 1);
  assertEquals(costCalculator.getCost(heavyFn), 10);
});

Deno.test("RateLimitExceeded constructor sets properties correctly", () => {
  const error = new RateLimitExceeded(5000);

  assertEquals(error.message, "RateLimitExceeded");
  assertEquals(error.retryAfter, 5000);
  assertEquals(error.isRetryable, true);
  assert(error instanceof Error);
});

Deno.test("RateLimitExceeded works without retryAfter", () => {
  const error = new RateLimitExceeded();

  assertEquals(error.message, "RateLimitExceeded");
  assertEquals(error.retryAfter, undefined);
  assertEquals(error.isRetryable, true);
});

Deno.test("RateLimitExceeded isRetryable is readonly", () => {
  const error = new RateLimitExceeded(1000);

  // isRetryable should always be true
  assertEquals(error.isRetryable, true);
});

Deno.test("RetryableSettings type allows all optional properties", () => {
  const settings: RetryableSettings = {};

  assertEquals(settings.maxRetries, undefined);
  assertEquals(settings.maxDelay, undefined);
  assertEquals(settings.nextDelayCalc, undefined);
  assertEquals(settings.errorHelper, undefined);
  assertEquals(settings.rateLimiterOrExecutor, undefined);
});

Deno.test("RetryableSettings type accepts all properties", () => {
  const settings: RetryableSettings = {
    maxRetries: 5,
    maxDelay: 10000,
    nextDelayCalc: (attempt) => attempt * 1000,
    errorHelper: { isTransient: () => true },
    rateLimiterOrExecutor: {
      limits: [RateLimit.fixed(10)],
    },
  };

  assertEquals(settings.maxRetries, 5);
  assertEquals(settings.maxDelay, 10000);
  assertEquals(settings.nextDelayCalc?.(2), 2000);
  assertEquals(settings.errorHelper?.isTransient(new Error("mock transient")), true);
});

Deno.test("RateLimiterSettings requires limits array", () => {
  const settings: RateLimiterSettings = {
    limits: [RateLimit.fixed(10, 1000)],
  };

  assertEquals(settings.limits.length, 1);
  assertEquals(settings.executor, undefined);
});

Deno.test("RateLimiterSettings accepts multiple limits", () => {
  const settings: RateLimiterSettings = {
    limits: [
      RateLimit.fixed(10, 1000),
      RateLimit.fixed(100, 60000),
    ],
  };

  assertEquals(settings.limits.length, 2);
  assertEquals(settings.limits[0].rate, 10);
  assertEquals(settings.limits[1].rate, 100);
});
