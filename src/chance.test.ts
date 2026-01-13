import { chance } from "./chance.ts";
import { assert, assertNotEquals, assertGreaterOrEqual } from "@std/assert";

Deno.test("chance test", () => {
  const randomValue = chance.random();
  assert(randomValue >= 0 && randomValue < 1);
});

Deno.test("chance distribution test", () => {
  const MAX_SIZE = 65537;
  const fillSet = () => {
    const values = new Set<number>();
    for (let i = 0; i < MAX_SIZE; i++) {
      values.add(chance.random());
    }
    return values;
  }

  const values = fillSet();
  assert(values.size <= MAX_SIZE, "too many entries");
  assertGreaterOrEqual(values.size, MAX_SIZE-MAX_SIZE*.001, "suspicious # of random duplicate entries generated");
});

Deno.test("chance radnom string test", () => {
  assertNotEquals(chance.string(10), chance.string(10));
});
