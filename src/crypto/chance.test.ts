/// <reference no-default-lib="true" />
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
/// <reference lib="dom.asynciterable" />
/// <reference lib="deno.ns" />

import { assert } from "https://deno.land/std@0.213.0/assert/assert.ts";
import { chance } from "./chance.ts";
import { assertNotEquals } from "https://deno.land/std@0.213.0/assert/assert_not_equals.ts";

Deno.test("chance test", () => {
  const randomValue = chance.random();
  assert(randomValue >= 0 && randomValue < 1);
});

Deno.test("chance distribution test", () => {
  const fillSet = () => {
    const values = new Set<number>();
    for (let i = 0; i < 65537; i++) {
      values.add(chance.random());
    }
    return values;
  }

  let values = fillSet();
  if (values.size < 65537) {
    values = fillSet();
  }

  assert(values.size === 65537, "distribution test failed");
});

Deno.test("chance radnom string test", () => {
  assertNotEquals(chance.string(10), chance.string(10));
});
