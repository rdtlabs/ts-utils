/// <reference no-default-lib="true" />
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
/// <reference lib="dom.asynciterable" />
/// <reference lib="deno.ns" />

import { assert } from "@std/assert/assert.ts";
import { strings } from "./strings.ts";

Deno.test("strings areEqual test", () => {
  assert(strings.areEqual("a", "a"));
  assert(!strings.areEqual("a", "b"));
});

Deno.test("strings coalesce test", () => {
  assert(strings.coalesce(null, "a") === "a");
  assert(strings.coalesce("a", "b") === "a");
  assert(strings.coalesce("a", null) === "a");
  assert(strings.coalesce(null, null) === null);
});

Deno.test("strings is test", () => {
  assert(strings.is(""));
  assert(!strings.is(null));
});

Deno.test("strings isEmpty test", () => {
  assert(strings.isEmpty(""));
  assert(!strings.isEmpty(" "));
});

Deno.test("strings isNilOrEmpty test", () => {
  assert(strings.isNilOrEmpty(""));
  assert(strings.isNilOrEmpty(null));
  assert(strings.isNilOrEmpty(undefined));
  assert(!strings.isNilOrEmpty(" "));
});

Deno.test("strings isNilOrWhitespace test", () => {
  assert(strings.isNilOrWhitespace(""));
  assert(strings.isNilOrWhitespace(" "));
});

Deno.test("strings isNilOrEmpty test", () => {
  assert(strings.isNilOrEmpty(null));
  assert(strings.isNilOrEmpty(undefined));
});

Deno.test("strings isNot test", () => {
  assert(!strings.isNot(" "));
  assert(strings.isNot(1));
});

Deno.test("strings requireElse test", () => {
  assert(strings.requireElse("a", "b") === "a");
  assert(strings.requireElse(null, "a") === "a");
  assert(strings.requireElse(undefined, "a") === "a");
});

Deno.test("strings requireElseGet test", () => {
  assert(strings.requireElseGet("b", () => "a") === "b");
  assert(strings.requireElseGet(null, () => "a") === "a");
  assert(strings.requireElseGet(undefined, () => "a") === "a");
});

Deno.test("strings base64 test", () => {
  const value = strings.toBase64("a");
  assert(value === "YQ==");
  assert(strings.fromBase64(value) === "a");
});
