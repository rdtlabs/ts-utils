/// <reference no-default-lib="true" />
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
/// <reference lib="dom.asynciterable" />
/// <reference lib="deno.ns" />

import { fromAsyncIterable } from "./fromAsyncIterable.ts";
import { AsyncQueue } from "./queue/types.ts";
import { cancellableIterable } from "../cancellation/cancellableIterable.ts";
import { cancellationTimeout } from "../cancellation/cancellationTimeout.ts";
import { fromObservable } from "./fromObservable.ts";
import { assertEquals } from "@std/assert/assert_equals.ts";

Deno.test("fromObservable test", async () => {
  const queue = new AsyncQueue<number>();
  queue.enqueue(1);
  queue.enqueue(2);
  queue.enqueue(3);
  queue.enqueue(4);
  queue.setReadOnly();

  let counter = 0;
  const observable = fromAsyncIterable(queue);
  for await (const value of fromObservable(observable)) {
    assertEquals(value, ++counter);
  }
});

Deno.test("fromObservable cancellation test", async () => {
  const queue = new AsyncQueue<number>();
  queue.enqueue(1);
  queue.enqueue(2);
  queue.enqueue(3);

  const observable = fromAsyncIterable(
    cancellableIterable(queue, cancellationTimeout(5))
  );

  let counter = 0;
  for await (const value of fromObservable(observable)) {
    assertEquals(value, ++counter);
  }
});