/// <reference no-default-lib="true" />
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
/// <reference lib="dom.asynciterable" />
/// <reference lib="deno.ns" />

import { encryptOnce } from "./encryptOnce.ts";
import { TEST_STRING_KEY } from "./_utils.test.ts";
import { assertEquals } from "@std/assert/assert_equals.ts";
import { TEST_CLEAR_DATA } from "./_utils.test.ts";
import { decryptOnce } from "./decryptOnce.ts";

Deno.test("encryptOnce test", async () => {
  const enc = await encryptOnce(TEST_STRING_KEY, TEST_CLEAR_DATA);

  const clearText = await decryptOnce<typeof TEST_CLEAR_DATA>(
    TEST_STRING_KEY, enc
  );

  assertEquals(clearText.value, TEST_CLEAR_DATA.value);
});