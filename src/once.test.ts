/// <reference no-default-lib="true" />
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
/// <reference lib="dom.asynciterable" />
/// <reference lib="deno.ns" />

import { CancellationError } from "./cancellation/CancellationError.ts";
import { once } from "./once.ts";
import { assertEquals } from "https://deno.land/std@0.213.0/assert/assert_equals.ts";
import { assertRejects } from "https://deno.land/std@0.213.0/assert/assert_rejects.ts";

Deno.test("once test", () => {
  let count = 0;
  const fn = once(() => {
    return count++;
  });

  assertEquals(fn.status, "none");
  assertEquals(fn(), 0);
  assertEquals(count, 1);

  assertEquals(fn.status, "invoked");
  assertEquals(fn(), 0); //should be same
  assertEquals(count, 1); //should be same
});

Deno.test("once cancel test", () => {
  let count = 0;
  const fn = once(() => {
    return count++;
  });

  assertEquals(fn.status, "none");
  fn[Symbol.dispose]();
  assertEquals(fn.status, "cancelled");
  assertRejects(async () => {
    await fn();
  }, CancellationError);
});
