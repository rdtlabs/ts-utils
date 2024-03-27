/// <reference no-default-lib="true" />
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
/// <reference lib="dom.asynciterable" />
/// <reference lib="deno.ns" />

import { assert } from "@std/assert/assert.ts";
import { signal } from './Signal.ts';
import { CancellationError } from "../cancellation/CancellationError.ts";
import { cancellationTimeout } from "../cancellation/cancellationTimeout.ts";
import { assertFalse } from "@std/assert/assert_false.ts";

Deno.test("Signal notify test", async () => {
  const sig = signal();

  assertFalse(sig.state);

  queueMicrotask(() => sig.notify());

  await sig.wait();

  assert(sig.state);
});

Deno.test("Signal notifyAndReset test", async () => {
  const sig = signal();

  assertFalse(sig.state);

  queueMicrotask(() => sig.notifyAndReset());

  await sig.wait();

  assertFalse(sig.state);

  try {
    await sig.wait(10);
    assert(false, "error not thrown");
  } catch (e) {
    assert(e instanceof CancellationError);
  }
});

Deno.test("Signal reset test", () => {
  const sig = signal(true);

  assert(sig.state);

  sig.reset();

  assertFalse(sig.state);
});

Deno.test("Signal Timeout", async () => {
  const token = cancellationTimeout(10);
  try {
    const sig = signal();
    await sig.wait(token);
    assert(false, "error not thrown");
  } catch (e) {
    assert(e instanceof CancellationError);
    assert(e.token === token);
  }

  try {
    const sig = signal();
    await sig.wait(10);
    assert(false, "error not thrown");
  } catch (e) {
    assert(e instanceof CancellationError);
  }

  try {
    const sig = signal(true);
    await sig.wait(10);
    assert(true);
  } catch {
    assert(false, "error should not be thrown");
  }
});
