import { QueueClosedError, QueueFullError, QueueReadOnlyError } from "./errors.ts";
import { assert, assertThrows, assertRejects } from "@std/assert";
import { asyncQueueStreams } from './asyncQueueStreams.ts';
import { waitGroup } from "../WaitGroup.ts";
import { CancellationError } from "../../cancellation/index.ts";
import { Cancellable } from "../../cancellation/Cancellable.ts";

Deno.test("asyncQueueStreams: on dequeue test", async () => {
  let dequeued = 0;
  let dequeuedOnce = 0;

  const wg = waitGroup(4);

  const queue = asyncQueueStreams<number>();

  queue.on("dequeue", () => {
    dequeued++;
    wg.done();
  });

  queue.on("dequeue", () => {
    dequeuedOnce++;
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

  assert(dequeued === 3);
  assert(dequeuedOnce === 1);

  queue.close();
  await queue.onClose();
});

Deno.test("asyncQueueStreams: on enqueue test", async () => {
  let queued = 0;
  let queuedOnce = 0;

  const wg = waitGroup(4);

  const queue = asyncQueueStreams<number>();

  queue.on("enqueue", () => {
    queued++;
    wg.done();
  });

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
  assert(queuedOnce === 1);

  queue.close();
  await queue.onClose();
});

Deno.test("asyncQueueStreams: on enqueue/dequeue test", async () => {
  let dequeued = 0;
  let queued = 0;
  let dequeuedOnce = 0;
  let queuedOnce = 0;

  const wg = waitGroup(8);

  const queue = asyncQueueStreams<number>();

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

  queue.close();
  await queue.onClose();
});

Deno.test("asyncQueueStreams: enqueue full error", () => {
  const queue = asyncQueueStreams<number>({
    bufferSize: 2,
    bufferStrategy: "fixed",
  });

  queue.enqueue(1);
  queue.enqueue(2);
  assertThrows(() => queue.enqueue(3), QueueFullError);
});

Deno.test("asyncQueueStreams: error on close", async () => {
  const queue = asyncQueueStreams<number>();

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

Deno.test("asyncQueueStreams: error on enqueue after readonly", () => {
  const queue = asyncQueueStreams<number>();

  queue.enqueue(1);
  queue.setReadOnly();

  assertThrows(() => queue.enqueue(2), QueueReadOnlyError);
});

Deno.test("asyncQueueStreams: enqueue drop", async () => {
  const queue = asyncQueueStreams<number>({
    bufferSize: 2,
    bufferStrategy: "drop",
  });

  queue.enqueue(1);
  queue.enqueue(2);
  queue.enqueue(3);

  assert(await queue.dequeue() === 1);
  assert(await queue.dequeue() === 2);
});

Deno.test("asyncQueueStreams: enqueue keep latest", async () => {
  const queue = asyncQueueStreams<number>({
    bufferSize: 2,
    bufferStrategy: "latest",
  });

  queue.enqueue(1);
  queue.enqueue(2);
  queue.enqueue(3);

  assert(await queue.dequeue() === 2);
  assert(await queue.dequeue() === 3);
});

Deno.test("asyncQueueStreams: iterate auto close", async () => {
  const queue = asyncQueueStreams<number>();

  queue.enqueue(1);
  queue.enqueue(2);
  queue.enqueue(3);

  queue.setReadOnly();

  let count = 1;
  for await (const item of queue) {
    assert(item === count++);
  }
});

Deno.test("asyncQueueStreams: iterate explicit close", async () => {
  const queue = asyncQueueStreams<number>();

  queue.enqueue(1);
  queue.enqueue(2);
  queueMicrotask(() => queue.enqueue(3));

  setTimeout(() => queue[Symbol.dispose](), 10);

  let count = 1;
  for await (const item of queue) {
    assert(item === count++);
  }
});

Deno.test("asyncQueueStreams: await onClose", async () => {
  const queue = asyncQueueStreams<number>();

  queue.enqueue(1);
  queue.setReadOnly();

  queueMicrotask(() => queue.close());

  await queue.onClose();
});

Deno.test("asyncQueueStreams: await onClose with propagation", async () => {
  const queue = asyncQueueStreams<number>();

  queue.enqueue(1);
  queue.setReadOnly();

  queueMicrotask(() => queue.close(new Error("forced error")));

  try {
    await queue.onClose(true);
    assert(false, "Expected an error to be thrown");
  } catch (err) {
    if (err instanceof Error) {
      assert(err.message === "forced error");
    }
  }
});

Deno.test("asyncQueueStreams: await dequeue", async () => {
  const queue = asyncQueueStreams<number>();

  const dequeuers = new Array<Promise<number>>();

  dequeuers.push(queue.dequeue(), queue.dequeue(), queue.dequeue());

  queueMicrotask(() => queue.enqueue(1));
  queueMicrotask(() => queue.enqueue(2));
  queueMicrotask(() => queue.enqueue(3));

  const all = await Promise.all(dequeuers);

  all.forEach((v, i) => assert(v === i + 1));

  queue.close();

  assert(queue.isClosed);
});

Deno.test("asyncQueueStreams: await dequeue with cancellation", async () => {
  const controller = Cancellable.create();

  const queue = asyncQueueStreams<number>();

  const wg = waitGroup(3);

  queueMicrotask(() => {
    queue.enqueue(1);
    wg.done();
  });

  queue.dequeue().finally(() => wg.done());

  const p = queue.dequeue(controller.token);
  queueMicrotask(() => {
    controller.cancel();
    wg.done();
  });

  await wg.wait();

  await assertRejects(() => p, CancellationError);
});

Deno.test("asyncQueueStreams: tryEnqueue", () => {
  const queue = asyncQueueStreams<number>();

  assert(queue.tryEnqueue(1));
  queue.setReadOnly();
  assert(!queue.tryEnqueue(2));
});

Deno.test("asyncQueueStreams: isEmpty test", async () => {
  const queue = asyncQueueStreams<number>(
    { bufferSize: 2, bufferStrategy: "fixed" },
  );

  queue.enqueue(1);
  queue.enqueue(2);
  assert(queue.isEmpty === false);
  queue.dequeue();
  queue.dequeue();
  assert((queue as { isEmpty: boolean }).isEmpty === true);

  queue.close();

  await queue.onClose();
});

Deno.test("asyncQueueStreams: isFull test", async () => {
  const queue = asyncQueueStreams<number>(
    { bufferSize: 2, bufferStrategy: "fixed" },
  );

  queue.enqueue(1);
  assert(queue.isFull === false);
  queue.enqueue(2);

  assert((queue as { isFull: boolean }).isFull === true);

  queue.dequeue();
  assert(queue.isFull === false);

  queue.close();

  await queue.onClose();
});
