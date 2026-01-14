import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import { Retryable, retryable } from "./Retryable.ts";
import { RateLimit } from "./rate.limit.ts";
import { NonRetryableError, RetryableError } from "../../errors/error.types.ts";
import { Deadline, DeadlineExceededError } from "../../deadline.ts";
import type { ErrorLike } from "../../types.ts";

Deno.test("retryable executes callable successfully", async () => {
  const retry = retryable();
  let callCount = 0;

  const result = await retry.execute(() => {
    callCount++;
    return "success";
  });

  assertEquals(result, "success");
  assertEquals(callCount, 1);
});

Deno.test("retryable executes async callable successfully", async () => {
  const retry = retryable();

  const result = await retry.execute(() => {
    return Promise.resolve(42);
  });

  assertEquals(result, 42);
});

Deno.test("retryable retries on transient error", async () => {
  const retry = retryable({ maxRetries: 3, maxDelay: 100 });
  let callCount = 0;

  const result = await retry.execute(() => {
    callCount++;
    if (callCount < 2) {
      throw new Error("transient error");
    }
    return "success";
  });

  assertEquals(result, "success");
  assertEquals(callCount, 2);
});

Deno.test("retryable throws NonRetryableError after max retries", async () => {
  const retry = retryable({ maxRetries: 2, maxDelay: 50 });
  let callCount = 0;

  await assertRejects(
    () =>
      retry.execute(() => {
        callCount++;
        throw new Error("always fails");
      }),
    NonRetryableError,
  );

  assertEquals(callCount, 2);
});

Deno.test("retryable does not retry NonRetryableError", async () => {
  const retry = retryable({ maxRetries: 3, maxDelay: 100 });
  let callCount = 0;

  await assertRejects(
    () =>
      retry.execute(() => {
        callCount++;
        throw new NonRetryableError("do not retry");
      }),
    NonRetryableError,
  );

  assertEquals(callCount, 1);
});

Deno.test("retryable uses custom error helper", async () => {
  const retry = retryable({
    maxRetries: 3,
    maxDelay: 100,
    errorHelper: {
      isTransient: (err: ErrorLike) => {
        if (typeof err === "string") return err === "retry me";
        return err.message === "retry me";
      },
    },
  });
  let callCount = 0;

  await assertRejects(
    () =>
      retry.execute(() => {
        callCount++;
        throw new Error("do not retry me");
      }),
    Error,
    "do not retry me",
  );

  assertEquals(callCount, 1);
});

Deno.test("retryable uses custom delay calculation", async () => {
  const delays: number[] = [];
  const retry = retryable({
    maxRetries: 3,
    maxDelay: 1000,
    nextDelayCalc: (attempt) => {
      const delay = attempt * 10;
      delays.push(delay);
      return delay;
    },
  });
  let callCount = 0;

  await assertRejects(
    () =>
      retry.execute(() => {
        callCount++;
        throw new Error("always fails");
      }),
    NonRetryableError,
  );

  assertEquals(callCount, 3);
  assertEquals(delays.length, 2); // delays before 2nd and 3rd attempt
  assertEquals(delays[0], 10); // 1 * 10
  assertEquals(delays[1], 20); // 2 * 10
});

Deno.test("retryable respects RetryableError.retryAfter", async () => {
  const retry = retryable({ maxRetries: 2, maxDelay: 200 });
  let callCount = 0;
  const startTime = Date.now();

  const result = await retry.execute(() => {
    callCount++;
    if (callCount === 1) {
      throw new RetryableError("retry", 50);
    }
    return "done";
  });

  const elapsed = Date.now() - startTime;
  assertEquals(result, "done");
  assertEquals(callCount, 2);
  assert(elapsed >= 45, `Expected at least 45ms, got ${elapsed}ms`);
});

Deno.test("retryable throws DeadlineExceededError when deadline expired", async () => {
  const retry = retryable();
  const expiredDeadline = Deadline.after(-1);

  await assertRejects(
    () => retry.execute(() => "should not run", expiredDeadline),
    DeadlineExceededError,
  );
});

Deno.test("retryable throws for invalid maxRetries", () => {
  assertThrows(
    () => retryable({ maxRetries: 0 }),
    Error,
    "maxRetries must be a positive number",
  );

  assertThrows(
    () => retryable({ maxRetries: -1 }),
    Error,
    "maxRetries must be a positive number",
  );
});

Deno.test("retryable throws for invalid maxDelay", () => {
  assertThrows(
    () => retryable({ maxDelay: 0 }),
    Error,
    "maxDelay must be a positive number",
  );

  assertThrows(
    () => retryable({ maxDelay: -100 }),
    Error,
    "maxDelay must be a positive number",
  );
});

Deno.test("retryable accepts rate limiter settings", async () => {
  const retry = retryable({
    rateLimiterOrExecutor: {
      limits: [RateLimit.fixed(100, 1000)],
    },
    maxRetries: 2,
    maxDelay: 100,
  });

  const result = await retry.execute(() => "success");
  assertEquals(result, "success");
});

Deno.test("retryable factory function works", async () => {
  const retry = retryable();

  const result = await retry.execute(() => "hello");
  assertEquals(result, "hello");
});

Deno.test("Retryable.NONE executes without retry", async () => {
  let callCount = 0;

  await assertRejects(
    () =>
      Retryable.NONE.execute(() => {
        callCount++;
        throw new Error("fail");
      }),
    Error,
    "fail",
  );

  assertEquals(callCount, 1);
});

Deno.test("Retryable.NONE executes successfully", async () => {
  const result = await Retryable.NONE.execute(() => "no retry needed");
  assertEquals(result, "no retry needed");
});

Deno.test("Retryable.NONE executes synchronous functions", async () => {
  // Retryable.NONE should execute the callable directly
  let executed = false;
  const result = await Retryable.NONE.execute(() => {
    executed = true;
    return "done";
  });
  assertEquals(executed, true);
  assertEquals(result, "done");
});

Deno.test("retryable uses default values", async () => {
  // Just verify defaults work without explicit settings
  const retry = retryable();
  const result = await retry.execute(() => "works");
  assertEquals(result, "works");
});
