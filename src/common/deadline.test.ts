/// <reference no-default-lib="true" />
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
/// <reference lib="dom.asynciterable" />
/// <reference lib="deno.ns" />

import { assert } from "@std/assert/assert.ts";
import { deadline, Deadline } from "./deadline.ts";
import { delay } from "../index.ts";
import { assertEquals } from "@std/assert/assert_equals.ts";
import { assertFalse } from "@std/assert/assert_false.ts";

Deno.test("deadline expired test", async () => {
  const d = deadline(5);
  assertFalse(d.isExpired);
  await delay(d.remainingMillis + 1);
  assert(d.isExpired);
  assertEquals(d.remainingMillis, 0);
});

Deno.test("deadline afterMinutes test", async () => {
  const d = Deadline.afterMinutes(2);
  assert(d.remainingMillis > 110 * 1000);
  assertFalse(d.isExpired);
  await delay(100);
  assertFalse(d.isExpired);
  assert(d.remainingMillis > 110 * 1000);
});

Deno.test("deadline after seconds test", async () => {
  const d = Deadline.afterSeconds(30);
  assert(d.remainingMillis > 29 * 1000);
  assertFalse(d.isExpired);
  await delay(10);
  assertFalse(d.isExpired);
  assert(d.remainingMillis > 29 * 1000);
});

Deno.test("deadline not expired test", () => {
  const d = Deadline.afterMinutes(2);
  assertFalse(d.isExpired);
});

Deno.test("deadline remainingMillis test", () => {
  const d = Deadline.afterMinutes(2);
  assert(d.remainingMillis > (120 * 1000) - 5);
});

Deno.test("deadline from date test", async () => {
  const d = Deadline.from(new Date(Date.now() + 10000));
  assert(d.remainingMillis > (10 * 1000) - 5);
  assertFalse(d.isExpired);
  await delay(5);
  assertFalse(d.isExpired);
  assert(d.remainingMillis > (10 * 1000) - 20);
});

Deno.test("deadline after millis test", async () => {
  const d = Deadline.after(100000);
  assert(d.remainingMillis > 100000 - 5);
  assertFalse(d.isExpired);
  await delay(5);
  assertFalse(d.isExpired);
  assert(d.remainingMillis > 100000 - 20);
});

