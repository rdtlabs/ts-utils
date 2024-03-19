/// <reference no-default-lib="true" />
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
/// <reference lib="dom.asynciterable" />
/// <reference lib="deno.ns" />

import { assert } from "@std/assert/assert.ts";
import { deferred } from "./Deferred.ts";
import Cancellable from "../cancellation/Cancellable.ts";
import { assertRejects } from "@std/assert/assert_rejects.ts";
import CancellationError from "../cancellation/CancellationError.ts";

Deno.test("Deferred test", async () => {
  const def = deferred<number>();
  def.resolve(10);
  assert(await def.promise === 10);
});

Deno.test("Deferred cancel test", async () => {
  const controller = Cancellable.create();
  const def = deferred<number>(controller.token);
  queueMicrotask(() => controller.cancel());
  await assertRejects(() => def.promise, CancellationError);
});