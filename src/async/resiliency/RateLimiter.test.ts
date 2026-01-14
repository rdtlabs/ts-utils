import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import { rateLimiter } from "./RateLimiter.ts";
import { RateLimit, RateLimitExceeded } from "./rate.limit.ts";
import { DeadlineExceededError } from "../../deadline.ts";
import { Cancellable } from "../../cancellation/Cancellable.ts";
import { delay } from "../delay.ts";
import { WaitGroup } from "../WaitGroup.ts";
import { List } from "../../List.ts";

Deno.test("rateLimiter executes callable within rate limit", async () => {
  const limiter = rateLimiter({
    limits: [RateLimit.fixed(10, 1000)],
  });

  const result = await limiter.execute(() => "success");
  assertEquals(result, "success");
});

Deno.test("rateLimiter executes async callable", async () => {
  const limiter = rateLimiter({
    limits: [RateLimit.fixed(10, 1000)],
  });

  const result = await limiter.execute(() => {
    return Promise.resolve(42);
  });

  assertEquals(result, 42);
});

Deno.test("rateLimiter throws RateLimitExceeded when limit exceeded", async () => {
  const limiter = rateLimiter({
    limits: [RateLimit.fixed(2, 1000)],
  });

  await limiter.execute(() => "1");
  await limiter.execute(() => "2");

  await assertRejects(
    () => limiter.execute(() => "3"),
    RateLimitExceeded,
  );
});

Deno.test("rateLimiter RateLimitExceeded includes retryAfter", async () => {
  const limiter = rateLimiter({
    limits: [RateLimit.fixed(1, 1000)],
  });

  await limiter.execute(() => "first");

  try {
    await limiter.execute(() => "second");
    assert(false, "Should have thrown");
  } catch (e) {
    assert(e instanceof RateLimitExceeded);
    assert(e.retryAfter !== undefined);
    assert(e.retryAfter > 0);
    assert(e.retryAfter <= 1000);
  }
});

Deno.test("rateLimiter allows execution after tokens replenish", async () => {
  const limiter = rateLimiter({
    limits: [RateLimit.fixed(2, 100)], // 2 tokens per 100ms
  });

  await limiter.execute(() => "1");
  await limiter.execute(() => "2");

  // Wait for replenishment
  await delay(110);

  const result = await limiter.execute(() => "3");
  assertEquals(result, "3");
});

Deno.test("rateLimiter throws DeadlineExceededError when cancelled", async () => {
  const limiter = rateLimiter({
    limits: [RateLimit.fixed(10, 1000)],
  });

  const cancelledToken = Cancellable.cancelled();

  await assertRejects(
    () => limiter.execute(() => "should not run", cancelledToken),
    DeadlineExceededError,
  );
});

Deno.test("rateLimiter with variable cost calculator", async () => {
  const limiter = rateLimiter({
    limits: [
      RateLimit.variable(
        10,
        {
          getCost: () => 5, // Each operation costs 5 tokens
        },
        1000,
      ),
    ],
  });

  await limiter.execute(() => "1"); // Uses 5 tokens
  await limiter.execute(() => "2"); // Uses 5 tokens (total 10)

  // Should now be out of tokens
  await assertRejects(
    () => limiter.execute(() => "3"),
    RateLimitExceeded,
  );
});

Deno.test("rateLimiter with multiple limits - all must pass", async () => {
  const limiter = rateLimiter({
    limits: [
      RateLimit.fixed(10, 1000), // 10/second
      RateLimit.fixed(2, 100), // 2/100ms
    ],
  });

  await limiter.execute(() => "1");
  await limiter.execute(() => "2");

  // Second limit (2/100ms) should be exhausted
  await assertRejects(
    () => limiter.execute(() => "3"),
    RateLimitExceeded,
  );
});

Deno.test("rateLimiter throws for empty limits", () => {
  assertThrows(
    () => rateLimiter({ limits: [] }),
    Error,
    "At least one limit must be specified",
  );
});

Deno.test("rateLimiter handles single limit optimization", async () => {
  const limiter = rateLimiter({
    limits: [RateLimit.fixed(3, 1000)],
  });

  const result1 = limiter.execute(() => "a");
  const result2 = limiter.execute(() => "b");
  const result3 = limiter.execute(() => "c");
  const result4 = limiter.execute(() => "d");

  assertEquals(await result1, "a");
  assertEquals(await result2, "b");
  assertEquals(await result3, "c");
  await assertRejects(
    () => result4,
    RateLimitExceeded,
  );
});

Deno.test("rateLimiter handles two limits optimization", async () => {
  const limiter = rateLimiter({
    limits: [
      RateLimit.fixed(5, 1000),
      RateLimit.fixed(3, 500),
    ],
  });

  await limiter.execute(() => 1);
  await limiter.execute(() => 2);
  await limiter.execute(() => 3);

  // Third limit should be hit
  await assertRejects(
    () => limiter.execute(() => 4),
    RateLimitExceeded,
  );
});

Deno.test("rateLimiter handles three or more limits", async () => {
  const limiter = rateLimiter({
    limits: [
      RateLimit.fixed(10, 1000),
      RateLimit.fixed(5, 500),
      RateLimit.fixed(2, 100),
    ],
  });

  await limiter.execute(() => "x");
  await limiter.execute(() => "y");

  // Third limit (2/100ms) should be hit
  await assertRejects(
    () => limiter.execute(() => "z"),
    RateLimitExceeded,
  );
});

Deno.test("rateLimiter factory function works", async () => {
  const limiter = rateLimiter({
    limits: [RateLimit.fixed(5, 1000)],
  });

  const result = await limiter.execute(() => "factory works");
  assertEquals(result, "factory works");
});

Deno.test("rateLimiter returns tokens on failure for multiple limits", async () => {
  // Create a limiter where the second limit will fail after first passes
  const limiter = rateLimiter({
    limits: [
      RateLimit.fixed(10, 1000), // High limit
      RateLimit.fixed(1, 1000), // Low limit
    ],
  });

  // First call succeeds
  await limiter.execute(() => "1");

  // Second call should fail due to second limit
  await assertRejects(
    () => limiter.execute(() => "2"),
    RateLimitExceeded,
  );

  // After waiting, tokens should have been returned to first bucket
  await delay(1100);
  const result = await limiter.execute(() => "3");
  assertEquals(result, "3");
});

Deno.test("rateLimiter works with Cancellable.Never", async () => {
  const limiter = rateLimiter({
    limits: [RateLimit.fixed(5, 1000)],
  });

  const result = await limiter.execute(() => "with never token", Cancellable.Never);
  assertEquals(result, "with never token");
});

Deno.test("rateLimiter variable cost dynamic calculation", async () => {
  let callIndex = 0;
  const limiter = rateLimiter({
    limits: [
      RateLimit.variable(
        10,
        {
          getCost: () => {
            callIndex++;
            return callIndex <= 2 ? 3 : 5;
          },
        },
        1000,
      ),
    ],
  });

  await limiter.execute(() => "a"); // 3 tokens consumed (7 left)
  await limiter.execute(() => "b"); // 3 tokens consumed (4 left)

  // Third call would cost 5 tokens but only 4 left - should fail
  await assertRejects(
    () => limiter.execute(() => "c"),
    RateLimitExceeded,
  );
});
