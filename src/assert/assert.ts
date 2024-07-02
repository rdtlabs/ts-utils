// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.

import { AssertionError } from "./assertion_error.ts";

/**
 * An assertion error will be thrown if `expr` does not have truthy value,
 * else nothing will happen.
 */
export function assert(expr: unknown, msg = ""): asserts expr {
  if (!expr) {
    throw new AssertionError(msg);
  }
}
