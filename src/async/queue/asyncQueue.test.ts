/// <reference no-default-lib="true" />
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
/// <reference lib="dom.asynciterable" />
/// <reference lib="deno.ns" />

import { assert } from "https://deno.land/std@0.213.0/assert/assert.ts";
import { QueueClosedError, QueueFullError, QueueReadOnlyError } from "./errors.ts";
import { assertRejects } from "https://deno.land/std@0.213.0/assert/assert_rejects.ts";
import { asyncQueue } from './asyncQueue.ts';
import { waitGroup } from "../WaitGroup.ts";

Deno.test("AsyncQueue on dequeue test", async () => {
  let dequeued = 0;
  let queued = 0;
  let dequeuedOnce = 0;
  let queuedOnce = 0;

  const wg = waitGroup(8);

  const queue = asyncQueue<number>();

  queue.on("dequeue", () => {
    dequeued++;
    wg.done();
  });

  queue.on("enqueue", () => {
    queued++;
    wg.done();
  });

  queue.on("dequeue", () => {
    dequeuedOnce++;
    wg.done();
  }, true);

  queue.on("enqueue", () => {
    queuedOnce++;
    wg.done();
  }, true);

  queue.enqueue(1);
  queue.enqueue(2);
  queue.enqueue(3);

  queueMicrotask(() => {
    queue.dequeue();
    queue.dequeue();
    queue.dequeue();
  });

  await wg.wait();

  assert(queued === 3);
  assert(dequeued === 3);
  assert(queuedOnce === 1);
  assert(dequeuedOnce === 1);

  queue.close()
  await queue.onClose();
});

Deno.test("AsyncQueue enqueue full error", async () => {
  const queue = asyncQueue<number>({
    bufferSize: 2,
    bufferStrategy: "fixed",
  });

  queue.enqueue(1);
  queue.enqueue(2);
  await assertRejects(async () => await queue.enqueue(3), QueueFullError);
});

Deno.test("AsyncQueue error on close", async () => {
  const queue = asyncQueue<number>();

  queue.enqueue(1);
  queue.enqueue(2);
  queue.enqueue(3);

  assert(queue.size === 3);
  assert(await queue.dequeue() === 1);

  assert(await queue.dequeue() === 2);

  assert(await queue.dequeue() === 3);

  const d = queue.dequeue();
  queue[Symbol.dispose]();

  await assertRejects(() => d, QueueClosedError);
});

Deno.test("AsyncQueue error on enqueue after readonly", async () => {
  const queue = asyncQueue<number>();

  queue.enqueue(1);
  queue.setReadOnly();

  await assertRejects(async () => await queue.enqueue(2), QueueReadOnlyError);
});

Deno.test("AsyncQueue enqueue drop", async () => {
  const queue = asyncQueue<number>({
    bufferSize: 2,
    bufferStrategy: "drop",
  });

  queue.enqueue(1);
  queue.enqueue(2);
  queue.enqueue(3);

  assert(await queue.dequeue() === 1);
  assert(await queue.dequeue() === 2);
});

Deno.test("AsyncQueue enqueue keep latest", async () => {
  const queue = asyncQueue<number>({
    bufferSize: 2,
    bufferStrategy: "latest",
  });

  queue.enqueue(1);
  queue.enqueue(2);
  queue.enqueue(3);

  assert(await queue.dequeue() === 2);
  assert(await queue.dequeue() === 3);
});

Deno.test("AsyncQueue iterate auto close", async () => {
  const queue = asyncQueue<number>();

  queue.enqueue(1);
  queue.enqueue(2);
  queue.enqueue(3);

  queue.setReadOnly();

  let count = 1;
  for await (const item of queue) {
    assert(item === count++);
  }
});

Deno.test("AsyncQueue iterate explicit close", async () => {
  const queue = asyncQueue<number>();

  queue.enqueue(1);
  queue.enqueue(2);
  queueMicrotask(() => queue.enqueue(3));

  setTimeout(() => queue[Symbol.dispose](), 10);

  let count = 1;
  for await (const item of queue) {
    assert(item === count++);
  }
});

Deno.test("AsyncQueue await onClose", async () => {
  const queue = asyncQueue<number>();

  queue.enqueue(1);
  queue.setReadOnly();

  queueMicrotask(() => queue.close());

  await queue.onClose();
});

Deno.test("AsyncQueue await dequeue", async () => {
  const queue = asyncQueue<number>();

  const dequeuers = new Array<Promise<number>>();

  dequeuers.push(queue.dequeue());
  dequeuers.push(queue.dequeue());
  dequeuers.push(queue.dequeue());

  queueMicrotask(() => queue.enqueue(1));
  queueMicrotask(() => queue.enqueue(2));
  queueMicrotask(() => queue.enqueue(3));

  const all = await Promise.all(dequeuers);

  all.forEach((v, i) => assert(v === i + 1));

  queue.close();

  assert(queue.isClosed);
});

Deno.test("AsyncQueue tryEnqueue", async () => {
  const queue = asyncQueue<number>();

  assert(queue.tryEnqueue(1));
  queue.setReadOnly();
  assert(!queue.tryEnqueue(2));
});

Deno.test("AsyncQueue isEmpty test", async () => {
  const queue = asyncQueue<number>(
    { bufferSize: 2, bufferStrategy: "fixed" },
  );

  queue.enqueue(1);
  queue.enqueue(2);
  assert(queue.isEmpty === false);
  queue.dequeue();
  queue.dequeue();
  // getting strange typescript warning regarding the isEmpty being true
  // (as if it thinks the previous check implies the isEmpty property does not change)
  assert((queue as any).isEmpty === true);

  queue.close();

  await queue.onClose();
});

Deno.test("AsyncQueue isFull test", async () => {
  const queue = asyncQueue<number>(
    { bufferSize: 2, bufferStrategy: "fixed" },
  );

  queue.enqueue(1);
  assert(queue.isFull === false);
  queue.enqueue(2);

  // getting strange typescript warning regarding the isFull being true
  // (as if it thinks the previous check implies the isFull property does not change)
  assert((queue as any).isFull === true);

  queue.dequeue();
  assert(queue.isFull === false);

  queue.close();

  await queue.onClose();
});