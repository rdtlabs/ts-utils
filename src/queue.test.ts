import { assert, assertEquals, assertFalse } from "@std/assert";
import { createQueue } from "./Queue.ts";

Deno.test("Queue test", () => {
  const queue = createQueue();

  assert(queue.isEmpty);

  queue.enqueue(1);
  queue.enqueue(2);

  assert(!queue.isEmpty);
  assert(queue.size === 2);

  assertEquals(queue.dequeue(), 1);
  assert(!queue.isEmpty);
  assertEquals(queue.size, 1);

  assertEquals(queue.dequeue(), 2);
  assert(queue.isEmpty);
  assertEquals(queue.size, 0);
});

Deno.test("Queue toArray test", () => {
  const queue = createQueue();

  queue.enqueue(1);
  queue.enqueue(2);
  assertEquals(queue.size, 2);

  const arr = queue.toArray();
  assertEquals(arr, [1, 2]);
  assertEquals(queue.size, 0);
});

Deno.test("Queue toBufferLike test", () => {
  const buffer = createQueue().toBufferLike();

  buffer.write(1);
  buffer.write(2);

  assertEquals(buffer.size, 2);
  assertEquals(buffer.read(), 1);
  assertEquals(buffer.read(), 2);
  assertEquals(buffer.size, 0);
});

Deno.test("Queue clear test", () => {
  const queue = createQueue();
  queue.enqueue(1);
  assertFalse(queue.isEmpty);
  assertEquals(queue.size, 1);

  queue.clear();
  assertEquals(queue.size, 0);
  assert(queue.isEmpty);
});

Deno.test("Queue peek test", () => {
  const queue = createQueue();

  queue.enqueue(1);
  queue.enqueue(2);

  assertEquals(queue.size, 2);
  assertEquals(queue.peek(), 1);
  assertEquals(queue.size, 2);

  assertEquals(queue.dequeue(), 1);
  assertEquals(queue.peek(), 2);
  assertEquals(queue.size, 1);

  assertEquals(queue.dequeue(), 2);
  assertEquals(queue.peek(), undefined);
  assertEquals(queue.size, 0);
});



