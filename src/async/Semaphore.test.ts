/// <reference no-default-lib="true" />
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
/// <reference lib="dom.asynciterable" />
/// <reference lib="deno.ns" />

import { assert } from "@std/assert/assert.ts";
import { semaphore, Semaphore } from "./Semaphore.ts";
import { assertFalse } from "@std/assert/assert_false.ts";
import { WaitGroup } from "./WaitGroup.ts";
import { delay } from "./delay.ts";
import { Signal } from "./index.ts";

Deno.test("Semaphore tryAcquire test", () => {
  const sema = new Semaphore(1);
  assert(sema.tryAcquire());
  assertFalse(sema.tryAcquire());
  assert(sema.permits() === 0);
  sema.release();
  assert(sema.permits() === 1);
});

Deno.test("Semaphore acquire test", async () => {
  const sig = new Signal();
  const wg = new WaitGroup(5);
  const sema = semaphore(2);

  delay(10).then(() => {
    for (let i = 0; i < 5; i++) {
      sema.acquire().then(async () => {
        await sig.wait();
        sema.release();
        wg.done();
      });
    }
  });

  sig.notify();

  await wg.wait();
});

Deno.test("Semaphore wait test", async () => {
  const sig = new Signal();
  const wg = new WaitGroup(5);
  const sema = semaphore(2);

  delay(10).then(() => {
    for (let i = 0; i < 5; i++) {
      sema.wait().then(async () => {
        await sig.wait();
        sema.release();
        wg.done();
      });
    }
  });

  sig.notify();

  await wg.wait();
});