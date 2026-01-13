import { assert,assertRejects } from "@std/assert";
import { fromAsyncIterable } from "./fromAsyncIterable.ts";
import { AsyncQueue } from "./queue/types.ts";
import { Deferred } from "./Deferred.ts";
import { cancellableIterable } from "../cancellation/cancellableIterable.ts";
import { cancellationTimeout } from "../cancellation/cancellationTimeout.ts";
import { delay } from "./delay.ts";
import { CancellationError } from "../cancellation/CancellationError.ts";

Deno.test("fromAsyncIterable test", async () => {
  const queue = new AsyncQueue<number>();
  queue.enqueue(1);
  queue.enqueue(2);
  queue.enqueue(3);
  queue.enqueue(4);
  queue.setReadOnly();

  const observer = fromAsyncIterable(queue);

  const def = new Deferred<number>();
  let total = 0;
  observer.subscribe({
    next: (value) => {
      total += value;
    },
    complete: () => {
      def.resolve(total);
    },
    error: (e) => {
      def.reject(e);
    }
  });

  assert(await def.promise === 10);
});

Deno.test("fromAsyncIterable cancellation test", async () => {
  const queue = new AsyncQueue<number>();
  queue.enqueue(1);
  queue.setReadOnly();

  const observer = fromAsyncIterable(
    cancellableIterable(queue, cancellationTimeout(5))
  );

  await delay(10);

  const def = new Deferred<number>();
  observer.subscribe({
    error: (e) => {
      def.reject(e);
    }
  });

  assertRejects(() => def.promise, CancellationError);
});