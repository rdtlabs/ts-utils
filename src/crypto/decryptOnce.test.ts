/// <reference no-default-lib="true" />
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
/// <reference lib="dom.asynciterable" />
/// <reference lib="deno.ns" />

import { decryptOnce } from "./decryptOnce.ts";
import { base64 } from "../encoding/base64.ts";
import { TEST_STRING_KEY } from "./_utils.test.ts";
import { assertEquals } from "https://deno.land/std@0.213.0/assert/assert_equals.ts";
import { TEST_ENCRYPTED_DATA } from "./_utils.test.ts";
import { TEST_CLEAR_DATA } from "./_utils.test.ts";

Deno.test("decryptOnce test", async () => {
  const enc = {
    data: base64.toArrayBuffer(TEST_ENCRYPTED_DATA.data),
    iv: base64.toArrayBuffer(TEST_ENCRYPTED_DATA.iv)
  };

  const clearText = await decryptOnce<typeof TEST_CLEAR_DATA>(
    TEST_STRING_KEY, enc
  );

  assertEquals(clearText.value, TEST_CLEAR_DATA.value);
});