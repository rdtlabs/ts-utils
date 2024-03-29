/// <reference no-default-lib="true" />
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
/// <reference lib="dom.asynciterable" />
/// <reference lib="deno.ns" />

import { assert } from "@std/assert/assert.ts";
import { List } from "./List.ts";
import { assertRejects } from "@std/assert/assert_rejects.ts";

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

Deno.test("List readonly write error test", async () => {
  const list = List.readonly(1, 2, 3, 4, 5);
  await assertRejects(async () => {
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