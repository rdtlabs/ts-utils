import { assert, assertEquals, assertFalse, assertThrows } from "@std/assert";
import { TokenBucket, tokenBucket } from "./TokenBucket.ts";
import { NonRetryableError, InvalidArgumentError } from "../../errors/error.types.ts";
import { delay } from "../delay.ts";

Deno.test("tokenBucket creates bucket with correct initial balance", () => {
  const bucket = tokenBucket(10, 1000);

  // Should be able to consume all initial tokens
  assert(bucket.consumeTokens(10));
});

Deno.test("tokenBucket consumeTokens returns true when tokens available", () => {
  const bucket = tokenBucket(5, 1000);

  assert(bucket.consumeTokens(1));
  assert(bucket.consumeTokens(2));
  assert(bucket.consumeTokens(2));
});

Deno.test("tokenBucket consumeTokens returns false when insufficient tokens", () => {
  const bucket = tokenBucket(3, 1000);

  assert(bucket.consumeTokens(3));
  assertFalse(bucket.consumeTokens(1));
});

Deno.test("tokenBucket throws when tokens exceeds max balance", () => {
  const bucket = tokenBucket(5, 1000);

  assertThrows(
    () => bucket.consumeTokens(6),
    NonRetryableError,
    "tokens exceeds maxBalance",
  );
});

Deno.test("tokenBucket throws when tokens is not positive", () => {
  const bucket = tokenBucket(5, 1000);

  assertThrows(
    () => bucket.consumeTokens(0),
    Error,
    "tokens must be a positive number",
  );

  assertThrows(
    () => bucket.consumeTokens(-1),
    Error,
    "tokens must be a positive number",
  );
});

Deno.test("tokenBucket returnTokens adds tokens back", () => {
  const bucket = tokenBucket(5, 1000);

  bucket.consumeTokens(5);
  assertFalse(bucket.consumeTokens(1));

  bucket.returnTokens(3);
  assert(bucket.consumeTokens(3));
});

Deno.test("tokenBucket returnTokens does not exceed max balance", () => {
  const bucket = tokenBucket(5, 1000);

  bucket.consumeTokens(2);
  bucket.returnTokens(5); // Try to return more than was consumed

  // Should not exceed max of 5
  assert(bucket.consumeTokens(5));
  assertFalse(bucket.consumeTokens(1));
});

Deno.test("tokenBucket getTimeUntilConsumable returns correct delay", () => {
  const bucket = tokenBucket(10, 1000);

  bucket.consumeTokens(10);

  // Need 5 tokens, which is 50% of max, so delay should be ~500ms
  const delay = bucket.getTimeUntilConsumable(5);
  assertEquals(delay, 500);
});

Deno.test("tokenBucket getTimeUntilConsumable throws when tokens <= balance", () => {
  const bucket = tokenBucket(10, 1000);

  assertThrows(
    () => bucket.getTimeUntilConsumable(5),
    InvalidArgumentError,
    "tokens must be greater than the current balance",
  );
});

Deno.test("tokenBucket replenishes tokens over time", async () => {
  const bucket = tokenBucket(10, 100); // 10 tokens per 100ms

  bucket.consumeTokens(10);
  assertFalse(bucket.consumeTokens(1));

  await delay(50); // Wait 50ms - should replenish ~5 tokens
  assert(bucket.consumeTokens(5));

  await delay(60); // Wait more to get more tokens
  assert(bucket.consumeTokens(5));
});

Deno.test("tokenBucket throws for invalid maxTokenBalance", () => {
  assertThrows(
    () => tokenBucket(0, 1000),
    Error,
    "Rate must be a positive number",
  );

  assertThrows(
    () => tokenBucket(-1, 1000),
    Error,
    "Rate must be a positive number",
  );
});

Deno.test("tokenBucket throws for invalid replenishInterval", () => {
  assertThrows(
    () => tokenBucket(10, 0),
    Error,
    "Interval must be positive number",
  );

  assertThrows(
    () => tokenBucket(10, -100),
    Error,
    "Interval must be positive number",
  );
});

Deno.test("tokenBucket factory function works", () => {
  const bucket = tokenBucket(5, 500);

  assert(bucket.consumeTokens(3));
  assertEquals(typeof bucket.returnTokens, "function");
  assertEquals(typeof bucket.getTimeUntilConsumable, "function");
});

Deno.test("TokenBucket.UNLIMITED always allows consumption", () => {
  const bucket = TokenBucket.UNLIMITED;

  // Should always return true
  assert(bucket.consumeTokens(1));
  assert(bucket.consumeTokens(100));
  assert(bucket.consumeTokens(1000000));
});

Deno.test("TokenBucket.UNLIMITED getTimeUntilConsumable returns 0", () => {
  assertEquals(TokenBucket.UNLIMITED.getTimeUntilConsumable(100), 0);
});

Deno.test("TokenBucket.UNLIMITED returnTokens is no-op", () => {
  // Should not throw
  TokenBucket.UNLIMITED.returnTokens(100);
});

Deno.test("TokenBucket.NON_RETRYABLE throws on consumption", () => {
  assertThrows(
    () => TokenBucket.NON_RETRYABLE.consumeTokens(1),
    NonRetryableError,
    "No more tokens",
  );
});

Deno.test("TokenBucket.NON_RETRYABLE getTimeUntilConsumable returns 0", () => {
  assertEquals(TokenBucket.NON_RETRYABLE.getTimeUntilConsumable(1), 0);
});

Deno.test("TokenBucket.NON_RETRYABLE returnTokens is no-op", () => {
  // Should not throw
  TokenBucket.NON_RETRYABLE.returnTokens(100);
});

Deno.test("tokenBucket uses default replenish interval of 1000ms", () => {
  const bucket = tokenBucket(10);

  bucket.consumeTokens(10);
  // Need 10 tokens, full replenish takes 1000ms
  const delay = bucket.getTimeUntilConsumable(10);
  assertEquals(delay, 1000);
});

Deno.test("tokenBucket handles partial token consumption", () => {
  const bucket = tokenBucket(10, 1000);

  assert(bucket.consumeTokens(3));
  assert(bucket.consumeTokens(3));
  assert(bucket.consumeTokens(3));
  assertFalse(bucket.consumeTokens(2)); // Only 1 left
  assert(bucket.consumeTokens(1));
});
