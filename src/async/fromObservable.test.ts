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
import { createObservable } from "./createObservable.ts";
import { assertEquals } from "https://deno.land/std@0.213.0/assert/assert_equals.ts";
import { assert } from "https://deno.land/std@0.213.0/assert/assert.ts";
import { WaitGroup } from "./WaitGroup.ts";
import { assertRejects } from "https://deno.land/std@0.213.0/assert/assert_rejects.ts";
import { Subscriber } from "./_rx.types.ts";

Deno.test("fromObservable test", async () => {
  const queue = new AsyncQueue<number>();
  queue.enqueue(1);
  queue.enqueue(2);
  queue.enqueue(3);
  queue.enqueue(4);
  queue.setReadOnly();

  let counter = 0;
  const observer = fromAsyncIterable(queue);
  for await (const value of fromObservable(observer)) {
    assertEquals(value, ++counter);
  }
});

Deno.test("fromObservable cancellation test", async () => {
  const queue = new AsyncQueue<number>();
  queue.enqueue(1);
  queue.enqueue(2);
  queue.enqueue(3);

  const observer = fromAsyncIterable(
    cancellableIterable(queue, cancellationTimeout(5))
  );

  let counter = 0;
  for await (const value of fromObservable(observer)) {
    assertEquals(value, ++counter);
  }
});

Deno.test("fromObservable buffer drop test", async () => {
  // deno-lint-ignore no-explicit-any
  let timerId: any;

  const start = new WaitGroup(1);
  const fn = (sub: Required<Subscriber<number>>) => {
    queueMicrotask(() => {
      sub.next(1);
      sub.next(2);
      sub.next(3);
    });
    timerId = setTimeout(() => {
      sub.next(4);
      sub.next(5);
      start.done();
      timerId = setTimeout(() => sub.complete(), 0);
    }, 0);
  };

  const observer = createObservable<number>(fn);

  const it = fromObservable(observer, {
    bufferSize: 3,
    bufferStrategy: "drop",
  });

  await start.wait();

  const arr = [];
  for await (const value of it) {
    arr.push(value);
  }
  assert(arr.length === 3);
  assert(arr[0] === 1);
  assert(arr[1] === 2);
  assert(arr[2] === 3);

  if (timerId) {
    clearTimeout(timerId);
  }
});

Deno.test("fromObservable buffer latest test", async () => {
  // deno-lint-ignore no-explicit-any
  let timerId: any;

  const start = new WaitGroup(1);
  const fn = (sub: Required<Subscriber<number>>) => {
    queueMicrotask(() => {
      sub.next(10);
      sub.next(9);
      sub.next(8);
    });

    timerId = setTimeout(() => {
      sub.next(7);
      sub.next(6);
      sub.next(5);
      start.done();
      timerId = setTimeout(() => sub.complete(), 0);
    }, 0);

  };
  const observer = createObservable<number>(fn);
  const it = fromObservable(observer, {
    bufferSize: 2,
    bufferStrategy: "latest",
  });

  await start.wait();

  const arr = [];
  for await (const value of it) {
    arr.push(value);
  }
  assert(arr.length === 2);
  assert(arr[0] === 6);
  assert(arr[1] === 5);

  if (timerId) {
    clearTimeout(timerId);
  }
});

Deno.test("fromObservable buffer error test", async () => {
  // deno-lint-ignore no-explicit-any
  let timerId: any;

  const start = new WaitGroup(1);
  const fn = (sub: Required<Subscriber<number>>) => {
    queueMicrotask(() => {
      sub.next(1);
      sub.next(2);
    });

    timerId = setTimeout(() => {
      sub.next(3);
      start.done();
      timerId = setTimeout(() => sub.complete(), 0);
    }, 0);
  };

  const observer = createObservable<number>(fn);
  const it = fromObservable(observer, {
    bufferSize: 2,
    bufferStrategy: "fixed",
  });

  await start.wait();

  let finished = false;
  await assertRejects(async () => {
    for await (const _ of it) {
      // no-op
    }
    finished = true;
  });

  assert(!finished);

  if (timerId) {
    clearTimeout(timerId);
  }
});