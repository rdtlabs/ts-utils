/// <reference no-default-lib="true" />
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
/// <reference lib="dom.asynciterable" />
/// <reference lib="deno.ns" />

import { delay } from "./delay.ts";
import { assertRejects } from "@std/assert/assert_rejects.ts";
import CancellationError from "../cancellation/CancellationError.ts";
import Cancellable from "../cancellation/Cancellable.ts";

Deno.test("delay test", async () => {
  const promise = delay<number>(0);
  await promise;
});

Deno.test("delay cancel test", async () => {
  const promise = delay<number>(10, Cancellable.timeout(5));
  await assertRejects(() => promise, CancellationError);
});