import { Lazy } from "./lazy.ts";
import { assertEquals } from "@std/assert";

Deno.test("lazy fn test", () => {
  let count = 0;
  const fn = Lazy.fn(() => (value: number) => {
    count += value;
    return count;
  }, false);

  assertEquals(fn(10), 10); //should be same
  assertEquals(count, 10); //should be same

  assertEquals(fn(3), 13);
  assertEquals(count, 13);
});

Deno.test("lazy fn once test", () => {
  let count = 0;
  const fn = Lazy.fn(() => (value: number) => {
    count += value;
    return count;
  }, true);

  assertEquals(fn(7), 7); //should be same
  assertEquals(count, 7); //should be same

  assertEquals(fn(3), 7);
  assertEquals(count, 7);
});