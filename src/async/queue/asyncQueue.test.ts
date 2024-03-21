/// <reference no-default-lib="true" />
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
/// <reference lib="dom.asynciterable" />
/// <reference lib="deno.ns" />

import { assert } from "@std/assert/assert.ts";
import { QueueClosedError, QueueFullError, QueueReadOnlyError } from "./errors.ts";
import { assertRejects } from "@std/assert/assert_rejects.ts";
import { asyncQueue } from './asyncQueue.ts';

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