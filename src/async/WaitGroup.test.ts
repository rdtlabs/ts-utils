/// <reference no-default-lib="true" />
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
/// <reference lib="dom.asynciterable" />
/// <reference lib="deno.ns" />

import { assert } from "https://deno.land/std@0.213.0/assert/assert.ts";
import { assertEquals } from 'https://deno.land/std@0.213.0/assert/mod.ts';
import { waitGroup, WaitGroup } from './WaitGroup.ts';
import { CancellationError } from "../cancellation/CancellationError.ts";
import { cancellationTimeout } from "../cancellation/cancellationTimeout.ts";

Deno.test("WaitGroup test", async () => {
  let waiting = 0;

  const afterIncrement = waitGroup(3);
  const afterDecrement = waitGroup(3);
  const inner = new WaitGroup(1);

  const doIncrement = () => {
    waiting++;
    afterIncrement.done();
  }

  const doDecrement = () => {
    waiting--;
    afterDecrement.done();
  }

  const action = async () => {
    doIncrement();
    await inner.wait();
    doDecrement();
  };

  queueMicrotask(() => action());
  queueMicrotask(() => action());
  setTimeout(() => action(), 10);

  await afterIncrement.wait();

  assertEquals(waiting, 3);

  inner.done();

  await afterDecrement.wait();

  assertEquals(waiting, 0);
});

Deno.test("WaitGroup Timeout", async () => {
  const token = cancellationTimeout(10);
  try {
    const wg = new WaitGroup(1);
    await wg.wait(token);
    assert(false, "error not thrown");
  } catch (e) {
    assert(e instanceof CancellationError);
    assert(e.token === token);
  }

  try {
    const wg = new WaitGroup(1);
    await wg.wait(10);
    assert(false, "error not thrown");
  } catch (e) {
    assert(e instanceof CancellationError);
  }

  try {
    const wg = new WaitGroup();
    await wg.wait(10);
    assert(true);
  } catch {
    assert(false, "error should not be thrown");
  }
});
