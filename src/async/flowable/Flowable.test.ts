import { asyncQueue } from "../queue/asyncQueue.ts";
import { Flowable } from "./Flowable.ts";
import { CountingEvent } from "../fromEvent.test.ts";
import { Cancellable } from "../../cancellation/Cancellable.ts";
import { waitGroup } from "../WaitGroup.ts";
import { assert } from "https://deno.land/std@0.213.0/assert/assert.ts";
import { createObservable } from "../createObservable.ts";
import { deferred } from "../Deferred.ts";
import { CancellationError } from "../../cancellation/CancellationError.ts";
import { assertRejects } from "https://deno.land/std@0.213.0/assert/assert_rejects.ts";

Deno.test("flowable static array test", async () => {
  const arr = await Flowable
    .of([1, 2, 3, 4, 5])
    .filter(x => x % 2 === 0)
    .map(x => x * 2)
    .toArray();

  assert(2 === arr.length);
  assert(arr[0] === 4);
  assert(arr[1] === 8);
});

Deno.test("flowable queue test", async () => {
  const queue = createQueue();

  queueMicrotask(() => {
    queue.setReadOnly();
  });

  const arr = await Flowable
    .of(queue)
    .filter(x => x % 2 === 0)
    .map(x => x * 2)
    .toArray();

  assert(2 === arr.length);
  assert(arr[0] === 4);
  assert(arr[1] === 8);
});

Deno.test("flowable resume on error", async () => {
  const queue = createQueue();

  queueMicrotask(() => {
    queue.setReadOnly();
  });

  let errorThrown = false;
  const arr = await Flowable
    .of(queue)
    .resumeOnError()
    .takeWhile(x => {
      return x < 5;
    })
    .compose(async function* (x) {
      if (x === 3) {
        errorThrown = true;
        throw new Error("test");
      }
      yield x;
    })
    .map(x => x * 2)
    .toArray();

  assert(3 === arr.length);

  assert(errorThrown);
});

Deno.test("flowable resume on error with throw", async () => {
  const queue = createQueue();

  queueMicrotask(() => {
    queue.setReadOnly();
  });

  await assertRejects(async () => {
    await Flowable
      .of(queue)
      .resumeOnError(c => {
        return !(c instanceof CancellationError)
      })
      .map(x => {
        if (x === 3) {
          throw new CancellationError();
        }
        return x * 2;
      })
      .forEach(() => {
        // do nothing
      });
  }, CancellationError);
});

Deno.test("flowable resume on error with NOT throw on cancellation", async () => {
  const queue = createQueue();

  queueMicrotask(() => {
    queue.setReadOnly();
  });

  await Flowable
    .of(queue)
    .map(x => {
      if (x === 3) {
        throw new CancellationError();
      }
      return x * 2;
    })
    .forEach(() => {
      // do nothing
    }, false)
});

Deno.test("flowable iterator test", async () => {
  const queue = createQueue();

  queueMicrotask(() => {
    queue.setReadOnly();
  });

  const it = Flowable
    .of(queue)
    .toIterable();

  let count = 0;
  for await (const x of it) {
    assert(x === ++count);
  }
});

Deno.test("flowable to array test", async () => {
  const queue = createQueue();

  queue.setReadOnly();

  const arr = await Flowable
    .of(queue)
    .toArray();

  for (let i = 0; i < arr.length; i++) {
    assert(arr[i] === i + 1);
  }
});

Deno.test("flowable fromEvent test", async () => {
  const wg = waitGroup(3);

  queueMicrotask(() => {
    try {
      globalThis.dispatchEvent(new CountingEvent(0));
      globalThis.dispatchEvent(new CountingEvent(1));
      globalThis.dispatchEvent(new CountingEvent(2));
      globalThis.dispatchEvent(new CountingEvent(3));
    } finally {
      wg.done();
    }
  });

  let counter = 0;
  const cancellation = Cancellable.create();

  const arr = await Flowable
    .fromEvent<CountingEvent>("CountingEvent", {
      bufferSize: 3,
      bufferStrategy: "drop",
      cancellationToken: cancellation.token,
    })
    .peek(e => {
      counter++;
      if (e.count === 3) {
        setTimeout(() => {
          cancellation.cancel();
          wg.done();
        }, 10);
      }
    })
    .toArray();

  assert(arr.length === 4);

  await cancellation.cancelAfter(10).finally(() => wg.done());

  await wg.wait();
});

Deno.test("flowable takeWhile test", async () => {
  const queue = createQueue();

  queue.setReadOnly();

  const arr = await Flowable
    .of(queue)
    .takeWhile(x => x <= 3)
    .toArray();

  assert(3 === arr.length);
  for (let i = 0; i < arr.length; i++) {
    assert(arr[i] === i + 1);
  }
});

Deno.test("flowable skipUntil test", async () => {
  const queue = createQueue();

  queue.setReadOnly();

  const arr = await Flowable
    .of(queue)
    .skipUntil(x => x > 3)
    .toArray();

  assert(2 === arr.length);
  for (let i = 0; i < arr.length; i++) {
    assert(arr[i] === i + 4);
  }
});

Deno.test("flowable filter test", async () => {
  const queue = createQueue();

  queue.setReadOnly();

  const arr = await Flowable
    .of(queue)
    .filter(x => x > 1 && x < 5)
    .toArray();

  assert(3 === arr.length);
  assert(arr[0] === 2);
  assert(arr[1] === 3);
  assert(arr[2] === 4);
});

Deno.test("flowable peek test", async () => {
  const queue = createQueue();

  queue.setReadOnly();

  let sum = 0;
  const arr = await Flowable
    .of(queue)
    .peek(v => sum += v)
    .toArray();

  assert(5 === arr.length);
  assert(sum === 15);
});

Deno.test("flowable concat test", async () => {
  const create = (start: number, count: number) => {
    const queue = asyncQueue<number>();

    for (let i = 0; i < count; i++) {
      queue.enqueue(start++);
    }

    queue.setReadOnly();

    return Flowable.of(queue);
  };

  const f1 = create(1, 5);
  const f2 = create(6, 5);
  const arr = await Flowable.concat(f1, f2).toArray();

  assert(10 === arr.length);
  for (let i = 0; i < arr.length; i++) {
    assert(arr[i] === i + 1);
  }
});

Deno.test("flowable observable test", async () => {
  let timerId: ReturnType<typeof setTimeout> | undefined;
  const observable = createObservable<number>((sub) => {
    queueMicrotask(() => {
      sub.next(1);
      sub.next(2);
      sub.next(3);
      timerId = setTimeout(() => {
        sub.next(4);
        sub.next(5);
        sub.complete();
      }, 0);
    });
  });

  const arr = await Flowable
    .fromObservable(observable)
    .toArray();

  assert(5 === arr.length);
  for (let i = 0; i < arr.length; i++) {
    assert(arr[i] === i + 1);
  }

  if (timerId) {
    clearTimeout(timerId);
  }
});

Deno.test("flowable chunk test", async () => {
  const queue = asyncQueue<number>();
  for (let i = 0; i < 52; i++) {
    queue.enqueue(i);
  }

  queue.setReadOnly();

  const arr = await Flowable
    .of(queue)
    .chunk(10)
    .toArray();

  assert(6 === arr.length);
  for (let i = 0; i < arr.length; i++) {
    const buffer = arr[i];
    const expectedLength = i === arr.length - 1 ? 2 : 10;
    assert(buffer.length === expectedLength);
    for (let j = 0; j < expectedLength; j++) {
      assert(buffer[j] === i * 10 + j);
    }
  }
});

Deno.test("flowable toObservable test", async () => {
  const queue = createQueue();
  queue.setReadOnly();

  const def = deferred();
  const arr: number[] = [];
  Flowable
    .of(queue)
    .toObservable()
    .subscribe({
      next: (value) => {
        arr.push(value);
      },
      error: (e) => {
        def.reject(e);
      },
      complete: () => {
        def.resolve();
      },
    });

  await def.promise;

  assert(5 === arr.length);
  for (let i = 0; i < arr.length; i++) {
    assert(arr[i] === i + 1);
  }
});

Deno.test("flowable toObservable unsubscribe test", async () => {
  const queue = createQueue();

  queue.setReadOnly();

  const def = deferred();
  const arr: number[] = [];
  const unsubscribe = Flowable
    .of(queue)
    .toObservable()
    .subscribe({
      next: (value) => {
        arr.push(value);
        if (value === 3) {
          unsubscribe();
          def.resolve();
        }
      },
      error: (e) => {
        def.reject(e);
      },
      complete: () => {
        def.reject(new Error("Should not complete"));
      },
    });

  await def.promise;

  assert(3 === arr.length);
  for (let i = 0; i < arr.length; i++) {
    assert(arr[i] === i + 1);
  }
});

Deno.test("flowable into processor test", async () => {
  const queue = createQueue();

  queueMicrotask(() => {
    queue.setReadOnly();
  });

  const into = Flowable
    .of<number>()
    .map(x => x * 2);

  const arr = await Flowable
    .of(queue)
    .pipe(into)
    .toArray();

  assert(5 === arr.length);
  for (let i = 0; i < arr.length; i++) {
    assert(arr[i] === (i + 1) * 2);
  }
});

Deno.test("flowable with forEach cancellation token test", async () => {
  const queue = createQueue();

  queueMicrotask(() => {
    queue.setReadOnly();
  });

  const into = Flowable
    .of<number>()
    .map(x => x * 2);

  const controller = Cancellable.create();
  let largest = -1;
  await assertRejects(() => {
    const p = Flowable
      .of(queue)
      .pipe(into)
      .forEach(i => {
        largest = i;
        if (i === 6) {
          controller.cancel();
        }
      }, controller.token);

    return p;
  });

  assert(largest === 6);
});

Deno.test("flowable with forEach ignore cancellation token test", async () => {
  const queue = createQueue();

  queueMicrotask(() => {
    queue.setReadOnly();
  });

  const into = Flowable
    .of<number>()
    .map(x => x * 2);

  const controller = Cancellable.create();
  let largest = -1;
  await Flowable
    .of(queue)
    .pipe(into)
    .forEach(i => {
      largest = i;
      if (i === 6) {
        controller.cancel();
      }
    }, {
      token: controller.token,
      throwOnCancellation: false
    });

  assert(largest === 6);
});

function createQueue(...args: number[]) {
  const queue = asyncQueue<number>();

  if (args.length > 0) {
    for (const arg of args) {
      queue.enqueue(arg);
    }
  } else {
    queue.enqueue(1);
    queue.enqueue(2);
    queue.enqueue(3);
    queue.enqueue(4);
    queue.enqueue(5);
  }

  return queue;
}

Deno.test("flowable selectFirst test", async () => {
  const queue = createQueue();

  queue.setReadOnly();

  const result = await Flowable
    .of(queue)
    .selectFirst();

  assert(result.else(-1) === 1);
});

Deno.test("flowable selectLast test", async () => {
  const queue = createQueue();

  queue.setReadOnly();

  const result = await Flowable
    .of(queue)
    .selectLast();

  assert(result.else(-1) === 5);
});

Deno.test("flowable selectLast single test", async () => {
  const result = await Flowable
    .single(1)
    .selectLast();

  assert(result.else(-1) === 1);
});
