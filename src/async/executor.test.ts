import { assert, assertEquals } from "@std/assert";
import { executors } from "./executors.ts";
import { monitor } from "./Monitor.ts";
import { signal } from "./Signal.ts";
import { delay } from "./delay.ts";
import { chance } from "../chance.ts";

Deno.test("executor immediate test", () => {
  let hasRun = false;
  executors.immediate.execute(() => {
    hasRun = true;
  });
  assert(hasRun);
});

Deno.test("executor sequential test", async () => {
  const executor = executors.sequential();
  const c = monitor();

  let counter = -1;

  for (let i = 0; i < 10; i++) {
    const index = i;
    const increment = () => {
      counter++;
      c.pulseOne();
    };

    executor.execute(async () => {
      if (index % 3 === 0) {
        await executors.task.execute(increment);
      } else {
        increment();
      }
    });
  }

  for (let i = 0; i < 10; i++) {
    await c.wait();
    assertEquals(counter, i);
  }
});

Deno.test("executor task/micro/seqential", async () => {
  const executor = executors.sequential();
  const c = monitor();

  let counter = -1;

  for (let i = 0; i < 10; i++) {
    const index = i;
    const increment = () => {
      counter++;
      c.pulseOne();
    };

    executor.execute(async () => {
      if (index % 3 === 0) {
        await executors.task.execute(increment);
      } else if (index % 3 === 1) {
        await executors.micro.execute(increment);
      } else {
        increment();
      }
    });
  }

  for (let i = 0; i < 10; i++) {
    await c.wait();
    assertEquals(counter, i);
  }
});

Deno.test("executor concurrent", async () => {
  let counter = 0;
  const executor = executors.concurrent(3);

  const sig = signal();
  for (let i = 0; i < 10; i++) {
    const index = i;
    executor.execute(async () => {
      await sig.wait();
      counter++;
      if (counter > 3) {
        throw new Error(`[${index}] Counter is greater than 3`);
      }
      await delay(Math.floor(chance.random() * 10));
      counter--;
    });
  }

  sig.notify();

  executor.shutdown();
  await executor.onShutdown();
});
