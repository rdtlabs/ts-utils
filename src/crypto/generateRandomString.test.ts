/// <reference no-default-lib="true" />
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
/// <reference lib="dom.asynciterable" />
/// <reference lib="deno.ns" />

import { assertNotEquals } from "https://deno.land/std@0.213.0/assert/assert_not_equals.ts";
import { generateRandomString } from "./generateRandomString.ts";

Deno.test("generateRandomString test", () => {
  assertNotEquals(generateRandomString(10), generateRandomString(10));
});