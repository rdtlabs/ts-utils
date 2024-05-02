// /// <reference no-default-lib="true" />
// /// <reference lib="dom" />
// /// <reference lib="dom.iterable" />
// /// <reference lib="dom.asynciterable" />
// /// <reference lib="deno.ns" />

// import { assert } from "https://deno.land/std@0.213.0/assert/assert.ts";
// import { CancellablePromise } from "./CancellablePromise.ts";
// import { Cancellable } from "./Cancellable.ts";
// import { assertRejects } from "https://deno.land/std@0.213.0/assert/assert_rejects.ts";
// import { CancellationError } from "./CancellationError.ts";

// Deno.test("CancellablePromise resolve test", async () => {
//   const def = new CancellablePromise<number>(res => {
//     res(10);
//   });

//   assert(await def === 10);
// });

// Deno.test("CancellablePromise reject test", async () => {
//   const def = new CancellablePromise<number>((_, rej) => {
//     rej(new Error());
//   });

//   assertRejects(() => def, Error);
// });

// Deno.test("CancellablePromise cancel test", async () => {
//   const def = new CancellablePromise<number>(res => { });
//   queueMicrotask(() => def.cancel());
//   await assertRejects(() => def, CancellationError);
// });

// Deno.test("CancellablePromise cancel token test", async () => {
//   const controller = Cancellable.create();
//   const def = new CancellablePromise<number>(res => { }, controller.token);
//   controller.cancelAfter(10);
//   await assertRejects(() => def, CancellationError);
// });

// Deno.test("CancellablePromise oncancel and token test", async () => {
//   const controller = Cancellable.create();
//   let onCancelCalled = false;
//   const def = new CancellablePromise<number>(res => { }, {
//     token: controller.token,
//     onCancel: reason => {
//       assert(reason instanceof CancellationError);
//       onCancelCalled = true;
//     }
//   });

//   queueMicrotask(() => controller.cancel());
//   assert(!onCancelCalled);
//   await assertRejects(() => def, CancellationError);
//   assert(onCancelCalled);
// });