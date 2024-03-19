/// <reference no-default-lib="true" />
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
/// <reference lib="dom.asynciterable" />
/// <reference lib="deno.ns" />

import { monitor } from "./Monitor.ts";
import { WaitGroup } from "./WaitGroup.ts";
import { delay } from "./delay.ts";
import { assertEquals } from "@std/assert/assert_equals.ts";

Deno.test("Monitor test", async () => {
  const wg = new WaitGroup(5);
  const m = monitor();

  let count: number = 0;
  await delay(10).then(() => {
    for (let i = 0; i < 5; i++) {
      m.wait().then(() => {
        count++;
        wg.done();
      });
    }
  });

  m.pulseOne();
  await delay(0)
  assertEquals(count, 1);
  m.pulseAll();
  await wg.wait();
  assertEquals(count, 5);
});

