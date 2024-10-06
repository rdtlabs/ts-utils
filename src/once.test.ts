/// <reference no-default-lib="true" />
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
/// <reference lib="dom.asynciterable" />
/// <reference lib="deno.ns" />

import { CancellationError } from "./cancellation/CancellationError.ts";
import { assert, assertThrows } from "https://deno.land/std@0.213.0/assert/mod.ts";
import { once } from "./once.ts";
import { assertEquals } from "https://deno.land/std@0.213.0/assert/assert_equals.ts";

Deno.test("once test with params", () => {
  let count = 0;
  const fn = once((value: number) => {
    count += value;
    return count;
  });

  assertEquals(fn.status, "none");
  assertEquals(fn(10), 10); //should be same
  assertEquals(count, 10); //should be same

  assertEquals(fn.status, "invoked");
  assertEquals(fn(3), 10); //should be same as above
  assertEquals(count, 10); //should be same as above
});

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

Deno.test("once test double wrapped", () => {
  let count = 0;
  const fn = once(() => {
    return count++;
  });

  assertEquals(fn.status, "none");
  assertEquals(fn(), 0); //should be same
  assertEquals(count, 1); //should be same

  const fn2 = once(fn);

  assert(fn === fn2);
  assertEquals(fn2.status, "invoked");
  assertEquals(fn2(), 0); //should be same as above
});

Deno.test("once cancel test", () => {
  let count = 0;
  const fn = once(() => {
    return count++;
  });

  assertEquals(fn.status, "none");
  fn[Symbol.dispose]();
  assertEquals(fn.status, "cancelled");
  assertThrows(() => {
    fn();
  }, CancellationError);
});
