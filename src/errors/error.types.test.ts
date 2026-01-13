import { assert, assertFalse } from "@std/assert";
import { RetryableError, NonRetryableError } from "./error.types.ts";
import { Errors } from "./errors.ts";

const isTransientError = Errors.isTransient;
const getErrorForHttpCode = Errors.getErrorForHttpCode;

Deno.test("isTransientError test", () => {
  assert(isTransientError(new Error("test")));
  assert(isTransientError(429));
  assert(isTransientError("429"));
  assert(isTransientError(500));
  assert(isTransientError(503));
  assert(isTransientError(504));
  assert(!isTransientError(509));
  assert(isTransientError("ECONNRESET"));
  assert(isTransientError("ECONNREFUSED"));
  assert(isTransientError("ECONNABORTED"));
  assert(isTransientError("ETIMEDOUT"));
  assert(isTransientError(new RetryableError("test")));
  assert(!isTransientError(new NonRetryableError("test")));
  assert(!isTransientError(getErrorForHttpCode(400)));
  assert(isTransientError(getErrorForHttpCode(429)));
});

Deno.test("isTransientError code test", () => {
  assert(isTransientError(429));
  assert(isTransientError("429"));
  assert(isTransientError(500));
  assert(isTransientError(503));
  assert(isTransientError(504));
  assert(!isTransientError(509));
});

Deno.test("isTransientError legacy/string errors test", () => {
  assert(isTransientError("ECONNRESET"));
  assert(isTransientError("ECONNREFUSED"));
  assert(isTransientError("ECONNABORTED"));
  assert(isTransientError("ETIMEDOUT"));
});

Deno.test("isTransientError http error test", () => {
  assertFalse(isTransientError(getErrorForHttpCode(400)));
  assert(isTransientError(getErrorForHttpCode(429)));
});

Deno.test("isTransientError RetryableError test", () => {
  assert(isTransientError(new RetryableError("test")));
  assert(isTransientError(getErrorForHttpCode(429)));
});

Deno.test("isTransientError NonRetryableError test", () => {
  assertFalse(isTransientError(new NonRetryableError("test")));
  assertFalse(isTransientError(getErrorForHttpCode(400)));
});

Deno.test("isTransientError opaque error test", () => {
  assert(isTransientError(new Error("test")));
});