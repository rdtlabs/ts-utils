import { assertEquals } from "@std/assert";
import { monitor } from "./Monitor.ts";
import { WaitGroup } from "./WaitGroup.ts";
import { delay } from "./delay.ts";

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

