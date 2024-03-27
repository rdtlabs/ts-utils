/// <reference no-default-lib="true" />
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
/// <reference lib="dom.asynciterable" />
/// <reference lib="deno.ns" />

import { assert } from "@std/assert/assert.ts";
import { assertFalse } from "@std/assert/assert_false.ts";
import { NonRetryableError } from "./NonRetryableError.ts";
import { RetryableError } from "./RetryableError.ts";
import { getErrorForHttpCode } from "./getErrorForHttpCode.ts";
import { isTransientError } from "./isTransientError.ts";

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