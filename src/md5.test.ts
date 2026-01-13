import { assertEquals } from "@std/assert";
import { base64 } from "./encoding/base64.ts";
import { Md5 } from "./md5.ts";

const TEST_HASH = "dd50283a23394e7660f44f8a117e0e59"
const TEST_STRING = "md5 test string";
const TEST_DIGEST = "1KUjHFJ0siTcpj39PWnDMQ==";

Deno.test("md5 test", () => {
  const md5 = new Md5();
  md5.update(TEST_STRING);
  assertEquals(md5.toString(), TEST_HASH);
  assertEquals(base64.fromArrayBuffer(md5.digest()), TEST_DIGEST);
});
