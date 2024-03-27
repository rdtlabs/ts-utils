/// <reference no-default-lib="true" />
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
/// <reference lib="dom.asynciterable" />
/// <reference lib="deno.ns" />

import { assert } from "@std/assert/assert.ts";
import { assertEquals, assertNotEquals } from '@std/assert/mod.ts';
import { Secret } from './Secret.ts';

Deno.test("Secret encrypt/decrypt", async () => {
  const key = Secret.generateKey();
  const secret = Secret.of(key);
  const encrypted = await secret.encrypt("Hello, World!");
  const clearBuf = await secret.decrypt(encrypted);

  const decrypted = new TextDecoder().decode(clearBuf);

  assertEquals(decrypted, "Hello, World!");
});

Deno.test("Secret encrypt/decryptAsString", async () => {
  const key = Secret.generateKey();
  const secret = Secret.of(key);
  const encrypted = await secret.encrypt("Hello, World!");
  const decrypted = await secret.decryptAsString(encrypted);

  assertEquals(decrypted, "Hello, World!");
});

Deno.test("Secret encrypt/decryptAsObect", async () => {
  const key = Secret.generateKey();
  const secret = Secret.of(key);
  const obj = {
    message: "Hello, World!",
    date: new Date().getTime(),
  };

  const encrypted = await secret.encrypt(obj);

  const decrypted = await secret.decryptAs<{ message: string, date: number; }>(encrypted);

  assertEquals(decrypted.message, obj.message);
  assertEquals(decrypted.date, obj.date);
});

Deno.test("Secret caching", async () => {
  const key = Secret.generateKey();
  const secret1 = Secret.of(key);
  const secret2 = Secret.of(key);

  assert(secret1 === secret2);
  assertEquals(secret1.toString(), secret2.toString());

  const obj = {
    message: "Hello, World!",
    date: new Date().getTime(),
  };

  const encrypted = await secret1.encrypt(obj);

  const decrypted = await secret2.decryptAs<{ message: string, date: number; }>(encrypted);

  assertEquals(decrypted.message, obj.message);
  assertEquals(decrypted.date, obj.date);

  secret1.dispose();
  secret2.dispose();

  const secret3 = Secret.of(key);

  assert(secret1 !== secret3);
  assert(secret2 !== secret3);

  assertNotEquals(secret1.toString(), secret3.toString());
  assertNotEquals(secret2.toString(), secret3.toString());
});