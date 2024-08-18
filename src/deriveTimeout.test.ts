/// <reference no-default-lib="true" />
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
/// <reference lib="dom.asynciterable" />
/// <reference lib="deno.ns" />

import { assert } from "https://deno.land/std@0.213.0/assert/assert.ts";
import { TimeoutInput } from "./types.ts";
import { assertEquals } from "https://deno.land/std@0.213.0/assert/assert_equals.ts";
import { deadline } from "./deadline.ts";
import { assertThrows } from "./index.ts";

Deno.test("deriveTimeout Date test", () => {
  const d = new Date(Date.now() + 1000);
  const tm = TimeoutInput.deriveTimeout(d);
  assert(tm > 995 && tm <= 1000);
});

Deno.test("deriveTimeout millis test", () => {
  const tm = TimeoutInput.deriveTimeout(1000);
  assertEquals(tm, 1000);
});

Deno.test("deriveTimeout deadline test", () => {
  const tm = TimeoutInput.deriveTimeout(deadline(1000));
  assert(tm > 995 && tm <= 1000);
});

Deno.test("deriveTimeout error test", () => {
  assertThrows(() => {
    // deno-lint-ignore no-explicit-any
    TimeoutInput.deriveTimeout(null as any)
  }, TypeError);
});