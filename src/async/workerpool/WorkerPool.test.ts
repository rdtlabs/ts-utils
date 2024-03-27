/// <reference no-default-lib="true" />
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
/// <reference lib="dom.asynciterable" />
/// <reference lib="deno.ns" />

import { workerPool } from "./WorkerPool.ts";
import { signal } from "../Signal.ts";
import { waitGroup } from "../WaitGroup.ts";
import { delay } from "../delay.ts";
import { assertRejects } from "@std/assert/assert_rejects.ts";
import { QueueLengthExceededError } from "../../errors/QueueLengthExceededError.ts";
import { ShutdownError } from "../../errors/ShutdownError.ts";
import { assert } from "@std/assert/assert.ts";

Deno.test("WorkerPool test", async () => {
  let counter = 0;
  const pool = workerPool({
    maxConcurrency: 3
  });

  const wg = waitGroup(10);
  const sig = signal();
  for (let i = 0; i < 10; i++) {
    const index = i;
    pool.submit(async () => {
      try {
        await sig.wait();
        counter++;
        if (counter > 3) {
          throw new Error(`[${index}] Counter is greater than 3`);
        }
        await delay(Math.floor(Math.random() * 10));
        counter--;
      } finally {
        wg.done();
      }
    });
  }

  sig.notify();

  await wg.wait();
});

Deno.test("WorkerPool sequential test", async () => {
  let counter = 0;
  const pool = workerPool({
    maxConcurrency: 1
  });

  const wg = waitGroup(10);
  const sig = signal();
  for (let i = 0; i < 10; i++) {
    const index = i;
    pool.submit(async () => {
      try {
        await sig.wait();
        await delay(Math.floor(Math.random() * 10));
        if (index !== counter) {
          throw new Error(`[${index}] Execution order is invalid`);
        }
        counter++;
      } finally {
        wg.done();
      }
    });
  }

  sig.notify();

  await wg.wait();
});

Deno.test("WorkerPool fail max queue test", async () => {
  const pool = workerPool({
    maxConcurrency: 1,
    maxQueueLength: 2
  });

  const wg = waitGroup(3);
  const sig = signal();

  for (let i = 0; i < 3; i++) {
    pool.submit(async () => {
      await sig.wait();
      wg.done();
    });
  }

  await assertRejects(
    // deno-lint-ignore require-await
    async () => {
      pool.submit(() => sig.wait());
    },
    QueueLengthExceededError
  );

  sig.notify();

  await wg.wait();
});

Deno.test("WorkerPool fail shutdown test", async () => {
  const pool = workerPool({
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

Deno.test("WorkerPool shutdownNow test", async () => {
  const pool = workerPool({
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

Deno.test("WorkerPool shutdownNow test no max", async () => {
  const pool = workerPool({
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

Deno.test("WorkerPool isFull test no max", async () => {
  const pool = workerPool({
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
