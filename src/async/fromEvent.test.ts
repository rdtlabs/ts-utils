import { assertEquals } from "@std/assert";
import { fromEvent } from "./fromEvent.ts";
import { Cancellable } from "../cancellation/index.ts";
import { WaitGroup } from "./WaitGroup.ts";

Deno.test("fromEvent cancellation test", async () => {
  queueMicrotask(() => {
    globalThis.dispatchEvent(new CountingEvent(0));
    globalThis.dispatchEvent(new CountingEvent(1));
    globalThis.dispatchEvent(new CountingEvent(2));
    globalThis.dispatchEvent(new CountingEvent(3));
  });

  const cancellation = Cancellable.create();
  let counter = 0;
  for await (
    const ev of fromEvent<CountingEvent>("CountingEvent",
      {
        bufferSize: 4,
        bufferStrategy: "fixed",
        cancellationToken: cancellation.token,
      }
    )
  ) {
    assertEquals(ev.count, counter++);
    if (counter === 3) {
      cancellation.cancel();
    }
  }

  assertEquals(3, counter);
});

Deno.test("fromEvent latest test", async () => {
  const it = fromEvent<CountingEvent>("CountingEvent"); //[Symbol.asyncIterator]();

  const wg = new WaitGroup(1);
  queueMicrotask(() => {
    globalThis.dispatchEvent(new CountingEvent(0));
    globalThis.dispatchEvent(new CountingEvent(1));
    globalThis.dispatchEvent(new CountingEvent(2));
    globalThis.dispatchEvent(new CountingEvent(3));
    wg.done();
  });

  await wg.wait();

  for await (const ev of it) {
    assertEquals(ev.count, 3);
    break;
  }
});

export class CountingEvent extends Event {
  constructor(public readonly count: number) {
    super("CountingEvent");
  }
}