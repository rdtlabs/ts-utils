/// <reference no-default-lib="true" />
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
/// <reference lib="dom.asynciterable" />
/// <reference lib="deno.ns" />

import { assertEquals } from "https://deno.land/std@0.213.0/assert/assert_equals.ts";
import { RingBuffer } from "./RingBuffer.ts";
import { BufferFullError } from "./BufferFullError.ts";
import { assert } from "https://deno.land/std@0.213.0/assert/assert.ts";
import { assertThrows } from "../index.ts";

Deno.test("RingBuffer drop test", () => {
  const buffer = new RingBuffer(10, "drop");
  assert(buffer.isEmpty);

  for (let i = 0; i < 20; i++) {
    buffer.write(i);
  }

  assertEquals(buffer.size, 10);
  assert(buffer.isFull);

  let counter = 0;
  while (!buffer.isEmpty) {
    assertEquals(buffer.read(), counter++);
  }
});

Deno.test("RingBuffer latest test", () => {
  const buffer = new RingBuffer(10, "latest");
  assert(buffer.isEmpty);

  for (let i = 0; i < 20; i++) {
    buffer.write(i);
  }

  assert(buffer.isFull);

  assertEquals(buffer.size, 10);

  let counter = 10;
  for (const value of buffer) {
    assertEquals(value, counter++);
  }
});

Deno.test("RingBuffer error test", () => {
  const buffer = new RingBuffer(10, "fixed");
  assertThrows(() => {
    for (let i = 0; i < 20; i++) {
      buffer.write(i);
    }
  }, BufferFullError);
});

Deno.test("RingBuffer clear test", () => {
  const buffer = new RingBuffer(5, "fixed");
  assert(buffer.isEmpty);

  for (let i = 0; i < 5; i++) {
    buffer.write(i);
  }

  assert(buffer.isFull);
  assertEquals(buffer.size, 5);
  buffer.clear();
  assert(buffer.isEmpty);
});

Deno.test("RingBuffer iterator test", () => {
  const buffer = new RingBuffer(5, "fixed");
  assert(buffer.isEmpty);

  for (let i = 0; i < 5; i++) {
    buffer.write(i);
  }

  assert(buffer.isFull);

  assertEquals(buffer.size, 5);

  let counter = 0;
  for (const value of buffer) {
    assertEquals(value, counter++);
  }
});