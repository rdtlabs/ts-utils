/// <reference no-default-lib="true" />
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
/// <reference lib="dom.asynciterable" />
/// <reference lib="deno.ns" />

import { assert } from "https://deno.land/std@0.213.0/assert/assert.ts";
import { objects } from "./objects.ts";
import { assertFalse } from "https://deno.land/std@0.213.0/assert/assert_false.ts";
import { assertThrows } from "./index.ts";

Deno.test("objects coalesce test", () => {
  assert(objects.coalesce(null, "a") === "a");
  assert(objects.coalesce(1, 2) === 1);
  assert(objects.coalesce("a", null) === "a");
  assert(objects.coalesce(null, null) === null);
});

Deno.test("objects isBool test", () => {
  assert(!objects.isBool(""));
  assert(objects.isBool(true));
});

Deno.test("objects isDate test", () => {
  assertFalse(objects.isDate(""));
  assertFalse(objects.isDate(true));
  assert(objects.isDate(new Date()));
  assertFalse(objects.isDate(-1));
});

Deno.test("objects isNil test", () => {
  assert(objects.isNil(null));
  assert(objects.isNil(undefined));
  assert(!objects.isNil(1));
});

Deno.test("objects isNotNil test", () => {
  assert(objects.isNotNil(1));
  assert(!objects.isNotNil(null));
});

Deno.test("objects has test", () => {
  assert(objects.has({ a: 1 }, "a"));
  assert(!objects.has({ a: 1 }, "b"));
});

Deno.test("objects isStr test", () => {
  assert(objects.isStr(""));
  assert(!objects.isStr(null));
});

Deno.test("objects hasFunc test", () => {
  assert(objects.hasFunc({ a: () => 1 }, "a"));
  assert(!objects.hasFunc({ a: 1 }, "a"));
});

Deno.test("objects isFalse test", () => {
  assert(objects.isFalse(false));
  assert(!objects.isFalse(true));
  assert(objects.isFalse(null));
  assert(objects.isFalse(undefined));
});

Deno.test("objects isTrue test", () => {
  assert(objects.isTrue(true));
  assert(!objects.isTrue(false));
  assert(!objects.isTrue(null));
  assert(!objects.isTrue(undefined));
});

Deno.test("objects isThenable test", () => {
  assert(objects.isThenable(Promise.resolve(1)));
  assert(!objects.isThenable(1));
  assert(objects.isThenable({ then: () => { } }));
});

Deno.test("objects isPromise test", () => {
  assert(objects.isPromise(Promise.resolve(1)));
  assert(!objects.isPromise(1));
});

Deno.test("objects isSymbol test", () => {
  assert(objects.isSymbol(Symbol()));
  assert(!objects.isSymbol(1));
});

Deno.test("objects isUndef test", () => {
  assert(objects.isUndef(undefined));
  assert(!objects.isUndef(1));
});

Deno.test("objects isFunc test", () => {
  assert(objects.isFunc(() => 1));
  assert(!objects.isFunc(1));
});

Deno.test("objects isObject test", () => {
  assert(objects.isObject({}));
  assert(objects.isObject(() => 1));
  assert(objects.isObject([]));
  assert(!objects.isObject(null));
  assert(!objects.isObject(undefined));
});

Deno.test("objects isNotBool test", () => {
  assert(objects.isNotBool(1));
  assert(!objects.isNotBool(true));
  assert(objects.isNotBool(null));
  assert(objects.isNotBool(undefined));
  assert(objects.isNotBool(""));
});

Deno.test("objects isNotNum test", () => {
  assert(objects.isNotNum("a"));
  assert(!objects.isNotNum(1));
});

Deno.test("objects isNum test", () => {
  assert(objects.isNum(1));
  assert(!objects.isNum("a"));
});

Deno.test("objects requireElse test", () => {
  assert(objects.requireElse("a", "b") === "a");
  assert(objects.requireElse(null, "a") === "a");
  assert(objects.requireElse(undefined, "a") === "a");
});

Deno.test("objects requireElseGet test", () => {
  assert(objects.requireElseGet("b", () => "a") === "b");
  assert(objects.requireElseGet(null, () => "a") === "a");
  assert(objects.requireElseGet(undefined, () => "a") === "a");
  assert(objects.requireElseGet(null, () => 1) === 1);
  assert(objects.requireElseGet(undefined, () => 1) === 1);
  assert(objects.requireElseGet(1, () => 2) === 1);
});

Deno.test("objects requireNonNil test", () => {
  assert(objects.requireNonNil(1) === 1);
  assert(objects.requireNonNil("a") === "a");
  assert(objects.requireNonNil({}));
  assert(objects.requireNonNil([]));
  assert(objects.requireNonNil(true) === true);
  assert(objects.requireNonNil(false) === false);
  assertThrows(() => objects.requireNonNil(null));
});

Deno.test("objects requireNumOrElse test", () => {
  assert(objects.requireNumOrElse(1, 2) === 1);
  assert(objects.requireNumOrElse(null, 2) === 2);
  assert(objects.requireNumOrElse(undefined, 2) === 2);
  assert(objects.requireNumOrElse("1", 2) === 1);
  assertThrows(() => objects.requireNumOrElse("a", 2));
});

Deno.test("objects requireElse test", () => {
  assert(objects.requireElse(null, 1) === 1);
  assert(objects.requireElse(undefined, 1) === 1);
  assert(objects.requireElse(1, 2) === 1);
});