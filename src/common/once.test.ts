/// <reference no-default-lib="true" />
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
/// <reference lib="dom.asynciterable" />
/// <reference lib="deno.ns" />

import { once } from "./once.ts";
import { assertEquals } from "@std/assert/assert_equals.ts";

Deno.test("once test", () => {
  let count = 0;
  const fn = once(() => {
    return count++;
  });

  assertEquals(fn(), 0);
  assertEquals(count, 1);
});
