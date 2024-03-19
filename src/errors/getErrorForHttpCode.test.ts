/// <reference no-default-lib="true" />
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
/// <reference lib="dom.asynciterable" />
/// <reference lib="deno.ns" />

import { assert } from "@std/assert/assert.ts";
import isTransientError from "./isTransientError.ts";
import RetryableError from "./RetryableError.ts";
import NonRetryableError from "./NonRetryableError.ts";
import getErrorForHttpCode from "./getErrorForHttpCode.ts";

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