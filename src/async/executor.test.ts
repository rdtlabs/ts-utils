/// <reference no-default-lib="true" />
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
/// <reference lib="dom.asynciterable" />
/// <reference lib="deno.ns" />

import { assert } from "@std/assert/assert.ts";
import { Executor } from "./executors.ts";
import { monitor } from "./Monitor.ts";
import { assertEquals } from "@std/assert/assert_equals.ts";
import { signal } from "./Signal.ts";
import { delay } from "./delay.ts";

Deno.test("executor immediate test", () => {
  let hasRun = false;
  Executor.immediate.execute(() => {
    hasRun = true;
  });
  assert(hasRun);
});

Deno.test("executor sequential test", async () => {
  const executor = Executor.sequential();
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
        await Executor.task(increment);
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
  const executor = Executor.sequential();
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
        await Executor.task(increment);
      } else if (index % 3 === 1) {
        await Executor.micro(increment);
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
  const executor = Executor.concurrent(3);

  const sig = signal();
  for (let i = 0; i < 10; i++) {
    const index = i;
    executor.execute(async () => {
      await sig.wait();
      counter++;
      if (counter > 3) {
        throw new Error(`[${index}] Counter is greater than 3`);
      }
      await delay(Math.floor(Math.random() * 10));
      counter--;
    });
  }

  sig.notify();

  executor.shutdown();
  await executor.onShutdown();
});
