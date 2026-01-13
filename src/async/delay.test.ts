import { delay } from "./delay.ts";
import { assertRejects } from "@std/assert";
import { CancellationError } from "../cancellation/CancellationError.ts";
import { Cancellable } from "../cancellation/Cancellable.ts";
import { DisposedError } from "../DisposedError.ts";

Deno.test("delay test", async () => {
  const promise = delay(0);
  await promise;
});

Deno.test("delay cancel test", async () => {
  const promise = delay(10, Cancellable.timeout(5));
  await assertRejects(() => promise, CancellationError);
});

Deno.test("delay dispose test", async () => {
  const promise = delay(10);
  promise[Symbol.dispose]();
  await assertRejects(() => promise, DisposedError);
});