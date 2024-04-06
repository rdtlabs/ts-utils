/// <reference no-default-lib="true" />
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
/// <reference lib="dom.asynciterable" />
/// <reference lib="deno.ns" />

import { assert } from "@std/assert/assert.ts";
import { Cancellable } from "./Cancellable.ts";
import { CancellationError } from "./CancellationError.ts";
import { deferred } from "../async/Deferred.ts";

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