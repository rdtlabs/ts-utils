
import { assert, assertFalse } from "@std/assert";
import { mutex } from "./Mutex.ts";
import { WaitGroup } from "./WaitGroup.ts";
import { delay } from "./delay.ts";
import { Signal } from "./index.ts";

Deno.test("Mutex tryLock/unlock test", () => {
  const m = mutex();
  assert(m.tryLock());
  assertFalse(m.tryLock());
  assert(m.isLocked);
  m.unlock();
  assertFalse(m.isLocked);
});

Deno.test("Mutex lock/unlock test", async () => {
  const sig = new Signal();
  const wg = new WaitGroup(5);
  const m = mutex();

  delay(10).then(() => {
    for (let i = 0; i < 5; i++) {
      m.lock().then(async () => {
        await sig.wait();
        m.unlock();
        wg.done();
      });
    }
  });

  sig.notify();

  await wg.wait();
});

Deno.test("Mutex wait/unlock test", async () => {
  const sig = new Signal();
  const wg = new WaitGroup(5);
  const m = mutex();

  delay(10).then(() => {
    for (let i = 0; i < 5; i++) {
      m.wait().then(async () => {
        await sig.wait();
        m.unlock();
        wg.done();
      });
    }
  });

  sig.notify();

  await wg.wait();
});

