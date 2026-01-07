/// <reference no-default-lib="true" />
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
/// <reference lib="dom.asynciterable" />
/// <reference lib="deno.ns" />

import { assert } from "https://deno.land/std@0.213.0/assert/assert.ts";
import { deferred } from "./Deferred.ts";
import { Cancellable } from "../cancellation/Cancellable.ts";
import { assertRejects } from "https://deno.land/std@0.213.0/assert/assert_rejects.ts";
import { CancellationError } from "../cancellation/CancellationError.ts";

Deno.test("Deferred test", async () => {
  const def = deferred<number>();
  assert(def.status === "pending");
  def.resolve(10);
  assert(await def.promise === 10);
  assert((def as {status: string}).status === "resolved");
});

Deno.test("Deferred cancel test", async () => {
  const controller = Cancellable.create();
  const def = deferred<number>(controller.token);
  assert(def.status === "pending");
  queueMicrotask(() => controller.cancel());
  await assertRejects(() => def.promise, CancellationError);
  assert((def as {status: string}).status === "rejected_cancelled");
});

Deno.test("Deferred reject test", async () => {
  const def = deferred<number>();
  assert(def.status === "pending");
  queueMicrotask(() => def.reject(new Error("Test error")));
  await assertRejects(() => def.promise, Error);
  assert((def as {status: string}).status === "rejected");
});