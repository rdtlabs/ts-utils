/// <reference no-default-lib="true" />
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
/// <reference lib="dom.asynciterable" />
/// <reference lib="deno.ns" />

import { assert } from "@std/assert/assert.ts";
import { deriveTimeout } from "./deriveTimeout.ts"; import { assertEquals } from "@std/assert/assert_equals.ts";
import { deadline } from "./deadline.ts";
import { assertRejects } from "@std/assert/assert_rejects.ts";

Deno.test("deriveTimeout Date test", () => {
  const d = new Date(Date.now() + 1000);
  const tm = deriveTimeout(d);
  assert(tm > 995 && tm <= 1000);
});

Deno.test("deriveTimeout millis test", () => {
  const tm = deriveTimeout(1000);
  assertEquals(tm, 1000);
});

Deno.test("deriveTimeout deadline test", () => {
  const tm = deriveTimeout(deadline(1000));
  assert(tm > 995 && tm <= 1000);
});

Deno.test("deriveTimeout error test", async () => {
  // deno-lint-ignore require-await
  await assertRejects(async () => {
    // deno-lint-ignore no-explicit-any
    deriveTimeout(null as any)
  }, TypeError);
});