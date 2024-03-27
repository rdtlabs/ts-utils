/// <reference no-default-lib="true" />
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
/// <reference lib="dom.asynciterable" />
/// <reference lib="deno.ns" />

import { assert } from "@std/assert/assert.ts";
import { AsyncQueue } from "../async/queue/types.ts";
import { cancellableIterable } from "./cancellableIterable.ts";
import { cancellationTimeout } from "./cancellationTimeout.ts";
import { delay } from "../async/delay.ts";

Deno.test("cancellableIterable with cancellation test", async () => {
  const queue = new AsyncQueue<number>();

  queue.enqueue(1);
  queue.enqueue(2);
  queue.enqueue(3);

  let count = 0;
  for await (const value of cancellableIterable(queue, cancellationTimeout(5))) {
    assert(value === ++count);
  }
});

Deno.test("cancellableIterable no error test", async () => {
  const queue = new AsyncQueue<number>();

  queue.enqueue(1);
  queue.enqueue(2);
  queue.enqueue(3);

  queue.setReadOnly();

  let count = 0;
  for await (const value of cancellableIterable(queue, cancellationTimeout(5))) {
    assert(value === ++count);
  }

  await delay(10);
});

Deno.test("cancellableIterable stop during iteration", async () => {
  const queue = new AsyncQueue<number>();

  queue.enqueue(1);
  queue.enqueue(2);
  queue.enqueue(3);

  queue.setReadOnly();

  let total = 0;
  for await (const value of cancellableIterable(queue, cancellationTimeout(5))) {
    total += value;
    await delay(10);
  }

  assert(total === 1);
});