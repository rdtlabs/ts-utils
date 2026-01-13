import { assert, assertRejects } from "@std/assert";
import { AsyncQueue } from "../async/queue/types.ts";
import { cancellationTimeout } from "./cancellationTimeout.ts";
import { delay } from "../async/delay.ts";
import { Cancellable } from "./Cancellable.ts";
import { deferred } from "../async/Deferred.ts";

import { CancellationError } from "./CancellationError.ts";
import { DisposedError } from "../DisposedError.ts";

Deno.test("CancellationToken combine and timeout test", async () => {
  const token1 = Cancellable.timeout(1);
  const token2 = Cancellable.timeout(5);
  const token3 = Cancellable.timeout(10);
  const token = Cancellable.combine(token1, token2, token3);

  assert(token3 === token); // should be the longest timeout

  try {
    await deferred(token).promise;
    assert(false, "error not thrown");
  } catch (e) {
    assert(e instanceof CancellationError);
    assert(e.token === token);
  }
});

Deno.test("CancellationToken combine and cancelled test", async () => {
  const token1 = Cancellable.timeout(1);
  const token2 = Cancellable.cancelled();
  const token = Cancellable.combine(token1, token2);

  assert(token2 === token); // should be the cancelled timeout

  try {
    await deferred(token1).promise;
    assert(false, "error not thrown");
  } catch (e) {
    assert(e instanceof CancellationError);
    assert(e.token === token1);
  }

  try {
    await deferred(token).promise;
    assert(false, "error not thrown");
  } catch (e) {
    assert(e instanceof CancellationError);
    assert(e.token === token);
  }
});

Deno.test("CancellationToken test", async () => {
  try {
    await Cancellable.invoke(() => {
      return 10;
    }, Cancellable.cancelled());
    assert(false, "error not thrown");
  } catch (e) {
    assert(e instanceof CancellationError);
  }

  const controller = Cancellable.create();
  try {
    const value = await Cancellable.invoke(() => {
      return 10;
    }, controller.token);
    assert(value === 10);
  } catch {
    assert(false, "error should not be thrown");
  }
});

Deno.test("Cancellation Controller test", async () => {
  const controller = Cancellable.create();

  const d = deferred();
  setTimeout(() => {
    controller.cancel();
    d.resolve();
  }, 10);

  try {
    await deferred(controller.token).promise;
  } catch (e) {
    assert(e instanceof CancellationError);
    assert(e.token === controller.token);
  }

  await d.promise;
});

Deno.test("Cancellation Controller cancelAfter test", async () => {
  const controller = Cancellable.create();
  const currentTime = Date.now();

  await controller.cancelAfter(10);

  assert(Date.now() - currentTime < 20);
});

Deno.test("Cancellation timeout dispose test", async () => {
  const token = Cancellable.timeout(10);
  token[Symbol.dispose]();
  await assertRejects(async () => {
    try {
      await deferred(token).promise
    } catch (e: unknown) {
      // deno-lint-ignore no-explicit-any
      throw (e as any)?.cause ?? e;
    }
  }, DisposedError);
});

Deno.test("Cancellable.iterable with cancellation test", async () => {
  const queue = new AsyncQueue<number>();

  queue.enqueue(1);
  queue.enqueue(2);
  queue.enqueue(3);

  let count = 0;
  for await (const value of Cancellable.iterable(queue, cancellationTimeout(5))) {
    assert(value === ++count);
  }
});

Deno.test("Cancellable.iterable no error test", async () => {
  const queue = new AsyncQueue<number>();

  queue.enqueue(1);
  queue.enqueue(2);
  queue.enqueue(3);

  queue.setReadOnly();

  let count = 0;
  for await (const value of Cancellable.iterable(queue, cancellationTimeout(5))) {
    assert(value === ++count);
  }

  await delay(10);
});

Deno.test("Cancellable.iterable stop during iteration", async () => {
  const queue = new AsyncQueue<number>();

  queue.enqueue(1);
  queue.enqueue(2);
  queue.enqueue(3);

  queue.setReadOnly();

  let total = 0;
  for await (const value of Cancellable.iterable(queue, cancellationTimeout(5))) {
    total += value;
    await delay(10);
  }

  assert(total === 1);
});

Deno.test("Cancellable.promise with default value", async () => {
  const unfinishedPromise = delay(100);
  try {
    const value = Cancellable.promise(
      unfinishedPromise.then(() => 10), {
      token: cancellationTimeout(5),
      defaultValueOnCancel: () => -1
    })

    assert(await value === -1);
  } finally {
    unfinishedPromise[Symbol.dispose]();
  }
});

Deno.test("Cancellable.promise with onCancel", async () => {
  const unfinishedPromise = delay(100);
  try {
    const onCancel = deferred<number>();
    const value = Cancellable.promise(
      unfinishedPromise.then(() => 10).finally(() => onCancel.reject("unexpected completion")), {
      token: cancellationTimeout(5),
      onCancel: () => onCancel.resolve(2),
      defaultValueOnCancel: () => -1
    })

    assert(await value === -1);
    assert(await onCancel.promise === 2);
  } finally {
    unfinishedPromise[Symbol.dispose]();
  }
});

Deno.test("Cancellable.promise with onCancel with cancellation erorr", async () => {
  const unfinishedPromise = delay(100);
  try {
    const token = cancellationTimeout(5);
    const onCancel = deferred<number>();

    await assertRejects(async () => {
      return await Cancellable.promise(
        unfinishedPromise.then(() => 10), {
        token,
        onCancel: () => onCancel.resolve(2)
      });
    });

    assert(await onCancel.promise === 2);
  } finally {
    unfinishedPromise[Symbol.dispose]();
  }
});

Deno.test("Cancellable.promise with cancellation erorr", async () => {
  const unfinishedPromise = delay(100);
  try {
    const token = cancellationTimeout(5);

    await assertRejects(async () => {
      return await Cancellable.promise(
        unfinishedPromise.then(() => 10), {
        token
      });
    });

  } finally {
    unfinishedPromise[Symbol.dispose]();
  }
});