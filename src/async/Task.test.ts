/// <reference no-default-lib="true" />
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
/// <reference lib="dom.asynciterable" />
/// <reference lib="deno.ns" />

import { assert } from "@std/assert/assert.ts";
import { assertEquals } from '@std/assert/mod.ts';
import { Task } from "./Task.ts";

Deno.test("Task test", async () => {
  assertEquals(10, await Task.run(async () => {
    return 10;
  }));
});

Deno.test("Task test after", async () => {
  const currentTime = Date.now();
  assertEquals("done", await Task.runAfter(async () => {
    const delta = Date.now() - currentTime;
    assert(delta >= 10 && delta < 20);
    return "done";
  }, 10));
});
