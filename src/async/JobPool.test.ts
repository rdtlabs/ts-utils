/// <reference no-default-lib="true" />
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
/// <reference lib="dom.asynciterable" />
/// <reference lib="deno.ns" />

import { JobPool } from "./JobPool.ts";
import { signal } from "./Signal.ts";
import { delay } from "./delay.ts";
import { assertRejects } from "@std/assert/assert_rejects.ts";
import { QueueLengthExceededError } from "../errors/QueueLengthExceededError.ts";
import { ShutdownError } from "../errors/ShutdownError.ts";
import { assert } from "@std/assert/assert.ts";
import { createCancellation } from "../cancellation/createCancellation.ts";

Deno.test("JobPool test", async () => {
  let counter = 0;
  const pool = new JobPool({
    maxConcurrency: 3
  });

  const sig = signal();
  const promises = [];
  for (let i = 0; i < 10; i++) {
    const index = i;
    const job = pool.submit(async () => {
      await sig.wait();
      counter++;
      if (counter > 3) {
        throw new Error(`[${index}] Counter is greater than 3`);
      }
      await delay(Math.floor(Math.random() * 10));
      counter--;
    });

    promises.push(job);
  }

  sig.notify();

  await Promise.all(promises);
});

Deno.test("JobPool sequential test", async () => {
  let counter = 0;
  const pool = new JobPool({
    maxConcurrency: 1
  });

  const sig = signal();
  const promises = [];
  for (let i = 0; i < 10; i++) {
    const index = i;
    const job = pool.submit(async () => {
      await sig.wait();
      await delay(Math.floor(Math.random() * 10));
      if (index !== counter) {
        throw new Error(`[${index}] Execution order is invalid`);
      }
      counter++;
    });

    promises.push(job);
  }

  sig.notify();

  await Promise.all(promises);
});

Deno.test("JobPool fail max queue test", async () => {
  const pool = new JobPool({
    maxConcurrency: 1,
    maxQueueLength: 2
  });

  const sig = signal();
  const promises = new Array<Promise<void>>();

  promises.push(pool.submit(() => sig.wait()));
  promises.push(pool.submit(() => sig.wait()));
  promises.push(pool.submit(() => sig.wait()));

  await assertRejects(
    // deno-lint-ignore require-await
    async () => {
      promises.push(pool.submit(() => sig.wait()));
    },
    QueueLengthExceededError
  );

  sig.notify();

  await Promise.all(promises);
});

Deno.test("JobPool fail shutdown test", async () => {
  const pool = new JobPool({
    maxConcurrency: 1,
    maxQueueLength: 2
  });

  const sig = signal();

  pool.submit(sig.wait);
  pool.submit(sig.wait);

  pool.shutdownNow();

  sig.notify();

  await assertRejects(
    async () => await pool.submit(sig.wait),
    ShutdownError
  );

  await pool.onShutdown();
});

Deno.test("JobPool shutdownNow test", async () => {
  const pool = new JobPool({
    maxConcurrency: 2,
  });

  const sig = signal();

  pool.submit(sig.wait);
  pool.submit(sig.wait);
  pool.submit(sig.wait);
  pool.submit(sig.wait);
  pool.submit(sig.wait);
  pool.submit(sig.wait);

  assert(pool.shutdownNow().length === 4);
  sig.notify();
  await pool.onShutdown();
});

Deno.test("JobPool shutdownNow test no max", async () => {
  const pool = new JobPool({
    maxConcurrency: 5,
  });

  const sig = signal();

  pool.submit(sig.wait);
  pool.submit(sig.wait);
  pool.submit(sig.wait);
  pool.submit(sig.wait);
  pool.submit(sig.wait);

  assert(pool.shutdownNow().length === 0);
  sig.notify();
  await pool.onShutdown();
});

Deno.test("JobPool isFull test no max", async () => {
  const pool = new JobPool({
    maxConcurrency: 2,
    maxQueueLength: 3,
  });

  const sig = signal();

  pool.submit(sig.wait);
  pool.submit(sig.wait);
  pool.submit(sig.wait);
  pool.submit(sig.wait);
  pool.submit(sig.wait);

  assert(pool.isFull);
  pool.shutdown();
  assert(pool.isShutdownInitiated);

  sig.notify();

  await pool.onShutdown();

  assert(!pool.isFull);
  assert(pool.isShutdown);
});

Deno.test("JobPool cancellation test", async () => {
  let counter = 0;
  const pool = new JobPool({
    maxConcurrency: 2
  });

  const controller = createCancellation();
  const sig = signal();
  for (let i = 0; i < 5; i++) {
    pool.submit(async () => {
      await sig.wait();
      counter++;
    }, controller.token).catch(e => {
      if (e.name !== "CancellationError") {
        throw e;
      }
    });
  }

  controller.cancel();

  sig.notify();

  pool.shutdown();

  await pool.onShutdown();

  assert(counter === 2);
});