/// <reference no-default-lib="true" />
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
/// <reference lib="dom.asynciterable" />
/// <reference lib="deno.ns" />

import { assert } from "https://deno.land/std@0.213.0/assert/assert.ts";
import { List } from "./List.ts";
import { assertEquals } from "https://deno.land/std@0.213.0/assert/assert_equals.ts";
import { Deferred, deferred } from "./async/Deferred.ts";
import { assertThrows } from "./index.ts";

Deno.test("List groupBy function test", () => {
  const list = new List(1, 2, 3, 4, 5);
  const groups = list.groupBy((value: any) => {
    return value % 2 === 0 ? "even" : "odd";
  });
  assert(groups instanceof Map);
  assert(groups.size === 2);
  assert(groups.get("even")!.length === 2);
  assert(groups.get("odd")!.length === 3);
});

Deno.test("List groupBy key test", () => {
  const list = List.of(
    { name: "Alice", age: 29, gender: "female" },
    { name: "Ashton", age: 31, gender: "nonbinary" },
    { name: "Christopher", age: 37, gender: "male" },
    { name: "Madison", age: 41, gender: "female" },
    { name: "Rosemary", age: 71, gender: "female" }
  );

  const groups = list.groupBy("gender");
  assert(groups instanceof Map);
  assert(groups.size === 3);
  assert(groups.get("female")!.length === 3);
  assert(groups.get("male")!.length === 1);
  assert(groups.get("nonbinary")!.length === 1);
});

Deno.test("List instanceOf test", () => {
  const list = new List(1, 2, 3, 4, 5);
  assert(list instanceof List);
});

Deno.test("List readonly write error test", () => {
  const list = List.readonly(1, 2, 3, 4, 5);
  assertThrows(() => {
    (list as any).push(6);
  });
  assert(list instanceof List);
});

Deno.test("List readonly groupBy function test", () => {
  const list = List.readonly(1, 2, 3, 4, 5);
  const groups = list.groupBy((value: any) => {
    return value % 2 === 0 ? "even" : "odd";
  });
  assert(groups instanceof Map);
  assert(groups.size === 2);
  assert(groups.get("even")!.length === 2);
  assert(groups.get("odd")!.length === 3);
});

Deno.test("List readonly groupBy key test", () => {
  const list = List.readonly(
    { name: "Alice", age: 29, gender: "female" },
    { name: "Ashton", age: 31, gender: "nonbinary" },
    { name: "Christopher", age: 37, gender: "male" },
    { name: "Madison", age: 41, gender: "female" },
    { name: "Rosemary", age: 71, gender: "female" }
  );

  const groups = list.groupBy("gender");
  assert(groups instanceof Map);
  assert(groups.size === 3);
  assert(groups.get("female")!.length === 3);
  assert(groups.get("male")!.length === 1);
  assert(groups.get("nonbinary")!.length === 1);
});

Deno.test("List distinct test", () => {
  const list = List.of(1, 2, 3, 4, 5, 1, 2, 3, 4, 5);

  const uniqueList = list.distinct();
  assert(uniqueList.length === 5);
  assertEquals(uniqueList[0], 1);
  assertEquals(uniqueList[1], 2);
  assertEquals(uniqueList[2], 3);
  assertEquals(uniqueList[3], 4);
  assertEquals(uniqueList[4], 5);
});

Deno.test("List from test", () => {
  const list = List.from(new Array(1, 2, 3, 4, 5));
  assert(list.length === 5);
  assertEquals(list[0], 1);
  assertEquals(list[1], 2);
  assertEquals(list[2], 3);
  assertEquals(list[3], 4);
  assertEquals(list[4], 5);
});

Deno.test("List fromAsync test", async () => {
  const defs = new List<Deferred<number>>();
  const list = new List<Promise<number>>();
  for (let i = 1; i <= 5; i++) {
    const def = deferred<number>();
    defs.push(def);
    list.push(def.promise);
  }

  queueMicrotask(() => {
    for (let i = 1; i <= 5; i++) {
      defs[i - 1].resolve(i);
    }
  });

  const asyncList = await List.fromAsync(list);

  assert(asyncList.length === 5);
  assertEquals(asyncList[0], 1);
  assertEquals(asyncList[1], 2);
  assertEquals(asyncList[2], 3);
  assertEquals(asyncList[3], 4);
  assertEquals(asyncList[4], 5);
});
