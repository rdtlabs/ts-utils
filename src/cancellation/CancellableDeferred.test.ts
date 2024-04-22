/// <reference no-default-lib="true" />
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
/// <reference lib="dom.asynciterable" />
/// <reference lib="deno.ns" />

import { assert } from "@std/assert/assert.ts";
import { CancellableDeferred } from "./CancellableDeferred.ts";
import { Cancellable } from "./Cancellable.ts";
import { assertRejects } from "@std/assert/assert_rejects.ts";
import { CancellationError } from "./CancellationError.ts";

Deno.test("CancellableDeferred resolve test", async () => {
  const def = new CancellableDeferred<number>();
  queueMicrotask(() => def.resolve(10));
  assert(await def.promise === 10);
});

Deno.test("CancellableDeferred reject test", async () => {
  const def = new CancellableDeferred<number>();
  queueMicrotask(() => def.reject(new Error()));
  assertRejects(() => def.promise, Error);
});

Deno.test("CancellableDeferred cancel test", async () => {
  const def = new CancellableDeferred<number>();
  queueMicrotask(() => def.promise.cancel());
  await assertRejects(() => def.promise, CancellationError);
});

Deno.test("CancellableDeferred cancel token test", async () => {
  const controller = Cancellable.create();
  const def = new CancellableDeferred<number>(controller.token);
  controller.cancelAfter(10);
  await assertRejects(() => def.promise, CancellationError);
});

Deno.test("CancellableDeferred oncancel token test", async () => {
  let onCancelCalled = false;
  const def = new CancellableDeferred<number>(
    reason => {
      assert(reason instanceof CancellationError);
      onCancelCalled = true;
    });

  queueMicrotask(() => def.promise.cancel());
  assert(!onCancelCalled);
  await assertRejects(() => def.promise, CancellationError);
  assert(onCancelCalled);
});

Deno.test("CancellableDeferred oncancel and token test", async () => {
  const controller = Cancellable.create();
  let onCancelCalled = false;
  const def = new CancellableDeferred<number>({
    token: controller.token,
    onCancel: reason => {
      assert(reason instanceof CancellationError);
      onCancelCalled = true;
    }
  });

  queueMicrotask(() => controller.cancel());
  assert(!onCancelCalled);
  await assertRejects(() => def.promise, CancellationError);
  assert(onCancelCalled);
});