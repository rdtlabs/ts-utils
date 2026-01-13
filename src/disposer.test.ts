import { assert } from "@std/assert";
import { Disposer } from "./disposer.ts";

Deno.test("disposer fromAsync test", () => {
  const disposer = Disposer.fromAsync(async () => { });
  assert(disposer[Symbol.asyncDispose] !== undefined, "Symbol.asyncDispose is not defined");
  assert(disposer[Symbol.asyncDispose]() instanceof Promise, "Symbol.asyncDispose did not return a Promise");
});


Deno.test("disposer from test", () => {
  const disposer = Disposer.from(() => { });
  assert(disposer[Symbol.dispose] !== undefined, "Symbol.dispose is not defined");
  assert(undefined === disposer[Symbol.dispose](), "Symbol.dispose returned a value");
});

Deno.test("disposer fromAsync with error test", async () => {
  const disposer = Disposer.fromAsync(() => {
    return Promise.reject(new Error("error"));
  });

  assert(disposer[Symbol.asyncDispose] !== undefined, "Symbol.asyncDispose is not defined");
  assert((await disposer()).length === 1, "Disposer did not return error");
});

Deno.test("disposer from with error test", () => {
  const disposer = Disposer.from(() => {
    throw new Error("error");
  });

  assert(disposer[Symbol.dispose] !== undefined, "Symbol.dispose is not defined");
  assert(disposer().length === 1, "Disposer did not return error");
});