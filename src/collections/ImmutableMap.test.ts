import { assertEquals, assertFalse } from "@std/assert";
import { ImmutableMap } from "./ImmutableMap.ts";

// =============================================================================
// Static factory methods
// =============================================================================

Deno.test("ImmutableMap.empty creates an empty map", () => {
  const map = ImmutableMap.empty<string, number>();
  assertEquals(map.size, 0);
  assertEquals(map.has("a"), false);
});

Deno.test("ImmutableMap.of creates a map from entries", () => {
  const map = ImmutableMap.of([["a", 1], ["b", 2], ["c", 3]]);
  assertEquals(map.size, 3);
  assertEquals(map.get("a"), 1);
  assertEquals(map.get("b"), 2);
  assertEquals(map.get("c"), 3);
});

Deno.test("ImmutableMap.of deduplicates keys (last wins)", () => {
  const map = ImmutableMap.of([["a", 1], ["a", 2]]);
  assertEquals(map.size, 1);
  assertEquals(map.get("a"), 2);
});

// =============================================================================
// ReadonlyMap interface
// =============================================================================

Deno.test("get returns undefined for missing keys", () => {
  const map = ImmutableMap.of([["a", 1]]);
  assertEquals(map.get("z"), undefined);
});

Deno.test("getOrDefault returns default for missing keys", () => {
  const map = ImmutableMap.of([["a", 1]]);
  assertEquals(map.getOrDefault("a", 99), 1);
  assertEquals(map.getOrDefault("z", 99), 99);
});

Deno.test("has returns true for existing keys", () => {
  const map = ImmutableMap.of([["a", 1]]);
  assertEquals(map.has("a"), true);
  assertFalse(map.has("z"));
});

Deno.test("keys returns all keys", () => {
  const map = ImmutableMap.of([["a", 1], ["b", 2]]);
  assertEquals([...map.keys()], ["a", "b"]);
});

Deno.test("values returns all values", () => {
  const map = ImmutableMap.of([["a", 1], ["b", 2]]);
  assertEquals([...map.values()], [1, 2]);
});

Deno.test("entries returns key-value pairs", () => {
  const map = ImmutableMap.of([["a", 1], ["b", 2]]);
  assertEquals([...map.entries()], [["a", 1], ["b", 2]]);
});

Deno.test("Symbol.iterator iterates entries", () => {
  const map = ImmutableMap.of([["x", 10]]);
  const collected: [string, number][] = [];
  for (const entry of map) {
    collected.push(entry);
  }
  assertEquals(collected, [["x", 10]]);
});

Deno.test("forEach visits every entry", () => {
  const map = ImmutableMap.of([["a", 1], ["b", 2]]);
  const visited: [string, number][] = [];
  map.forEach((v, k) => visited.push([k, v]));
  assertEquals(visited, [["a", 1], ["b", 2]]);
});

// =============================================================================
// Immutable operations
// =============================================================================

Deno.test("set returns a new map with the entry added", () => {
  const original = ImmutableMap.of([["a", 1]]);
  const updated = original.set("b", 2);

  assertEquals(original.size, 1);
  assertEquals(updated.size, 2);
  assertEquals(updated.get("b"), 2);
});

Deno.test("set overwrites existing key in new map", () => {
  const original = ImmutableMap.of([["a", 1]]);
  const updated = original.set("a", 99);

  assertEquals(original.get("a"), 1);
  assertEquals(updated.get("a"), 99);
});

Deno.test("delete returns a new map without the key", () => {
  const original = ImmutableMap.of([["a", 1], ["b", 2]]);
  const updated = original.delete("a");

  assertEquals(original.size, 2);
  assertEquals(updated.size, 1);
  assertFalse(updated.has("a"));
  assertEquals(updated.get("b"), 2);
});

Deno.test("delete returns same instance when key is absent", () => {
  const map = ImmutableMap.of([["a", 1]]);
  const same = map.delete("z");
  assertEquals(map === same, true);
});

Deno.test("merge combines two maps", () => {
  const a = ImmutableMap.of([["a", 1], ["b", 2]]);
  const b = ImmutableMap.of([["b", 99], ["c", 3]]);
  const merged = a.merge(b);

  assertEquals(merged.size, 3);
  assertEquals(merged.get("a"), 1);
  assertEquals(merged.get("b"), 99); // b's value wins
  assertEquals(merged.get("c"), 3);
});

Deno.test("merge returns same instance when other is empty", () => {
  const a = ImmutableMap.of([["a", 1]]);
  const empty = ImmutableMap.empty<string, number>();
  assertEquals(a.merge(empty) === a, true);
});

Deno.test("map transforms values", () => {
  const original = ImmutableMap.of([["a", 1], ["b", 2]]);
  const doubled = original.map((v) => v * 2);

  assertEquals(doubled.get("a"), 2);
  assertEquals(doubled.get("b"), 4);
  assertEquals(original.get("a"), 1); // original unchanged
});

Deno.test("map receives key as second argument", () => {
  const original = ImmutableMap.of([["a", 1]]);
  const result = original.map((v, k) => `${k}=${v}`);
  assertEquals(result.get("a"), "a=1");
});

Deno.test("filter keeps matching entries", () => {
  const map = ImmutableMap.of([["a", 1], ["b", 2], ["c", 3]]);
  const evens = map.filter((v) => v % 2 === 0);

  assertEquals(evens.size, 1);
  assertEquals(evens.get("b"), 2);
});

Deno.test("filter can use key in predicate", () => {
  const map = ImmutableMap.of([["keep", 1], ["drop", 2]]);
  const filtered = map.filter((_v, k) => k === "keep");
  assertEquals(filtered.size, 1);
  assertEquals(filtered.has("keep"), true);
});

// =============================================================================
// Builder
// =============================================================================

Deno.test("builder creates map via chaining", () => {
  const map = ImmutableMap.builder<string, number>()
    .set("a", 1)
    .set("b", 2)
    .set("c", 3)
    .build();

  assertEquals(map.size, 3);
  assertEquals(map.get("b"), 2);
});

Deno.test("builder with initial entries", () => {
  const map = ImmutableMap.builder([["x", 10], ["y", 20]] as [string, number][])
    .set("z", 30)
    .build();

  assertEquals(map.size, 3);
  assertEquals(map.get("x"), 10);
  assertEquals(map.get("z"), 30);
});

Deno.test("builder setAll adds multiple entries", () => {
  const map = ImmutableMap.builder<string, number>()
    .set("a", 1)
    .setAll([["b", 2], ["c", 3]])
    .build();

  assertEquals(map.size, 3);
});

Deno.test("builder delete removes entry", () => {
  const map = ImmutableMap.builder<string, number>()
    .set("a", 1)
    .set("b", 2)
    .delete("a")
    .build();

  assertEquals(map.size, 1);
  assertFalse(map.has("a"));
});

Deno.test("builder has and size reflect current state", () => {
  const builder = ImmutableMap.builder<string, number>()
    .set("a", 1)
    .set("b", 2);

  assertEquals(builder.has("a"), true);
  assertFalse(builder.has("z"));
  assertEquals(builder.size, 2);
});

Deno.test("toBuilder creates a builder from existing map", () => {
  const original = ImmutableMap.of([["a", 1], ["b", 2]]);
  const modified = original.toBuilder().set("c", 3).delete("a").build();

  assertEquals(original.size, 2); // original unchanged
  assertEquals(modified.size, 2);
  assertEquals(modified.has("c"), true);
  assertFalse(modified.has("a"));
});

// =============================================================================
// Serialization
// =============================================================================

Deno.test("toJSON converts to plain object with string keys", () => {
  const map = ImmutableMap.of([["a", 1], ["b", 2]]);
  assertEquals(map.toJSON(), { a: 1, b: 2 });
});

Deno.test("toJSON stringifies numeric keys", () => {
  const map = ImmutableMap.of([[1, "one"], [2, "two"]]);
  assertEquals(map.toJSON(), { "1": "one", "2": "two" });
});

Deno.test("toString produces human-readable output", () => {
  const map = ImmutableMap.of([["a", 1]]);
  assertEquals(map.toString(), "ImmutableMap(1) { a => 1 }");
});

Deno.test("toString for empty map", () => {
  const map = ImmutableMap.empty<string, number>();
  assertEquals(map.toString(), "ImmutableMap(0) {  }");
});

// =============================================================================
// Edge cases
// =============================================================================

Deno.test("works with non-string keys", () => {
  const map = ImmutableMap.of([[1, "one"], [2, "two"]]);
  assertEquals(map.get(1), "one");
  assertEquals(map.size, 2);
});

Deno.test("chained immutable operations produce correct results", () => {
  const result = ImmutableMap.of([["a", 1], ["b", 2], ["c", 3]])
    .set("d", 4)
    .delete("b")
    .filter((v) => v > 1)
    .map((v) => v * 10);

  assertEquals(result.size, 2);
  assertEquals(result.get("c"), 30);
  assertEquals(result.get("d"), 40);
});
