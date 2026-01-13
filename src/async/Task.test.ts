import { assert, assertEquals } from "@std/assert";
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
