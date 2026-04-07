import { assertEquals, assertFalse } from "@std/assert";
import { ImmutableSet } from "./ImmutableSet.ts";

// =============================================================================
// Static factory methods
// =============================================================================

Deno.test("ImmutableSet.empty creates an empty set", () => {
  const set = ImmutableSet.empty<number>();
  assertEquals(set.size, 0);
  assertFalse(set.has(1));
});

Deno.test("ImmutableSet.of creates a set from values", () => {
  const set = ImmutableSet.of([1, 2, 3]);
  assertEquals(set.size, 3);
  assertEquals(set.has(1), true);
  assertEquals(set.has(2), true);
  assertEquals(set.has(3), true);
});

Deno.test("ImmutableSet.of deduplicates values", () => {
  const set = ImmutableSet.of([1, 2, 2, 3, 3, 3]);
  assertEquals(set.size, 3);
});

// =============================================================================
// ReadonlySet interface
// =============================================================================

Deno.test("has returns false for missing values", () => {
  const set = ImmutableSet.of([1, 2]);
  assertFalse(set.has(99));
});

Deno.test("entries returns [value, value] pairs", () => {
  const set = ImmutableSet.of([1, 2]);
  const entries = [...set.entries()];
  assertEquals(entries, [[1, 1], [2, 2]]);
});

Deno.test("keys returns values (Set semantics)", () => {
  const set = ImmutableSet.of(["a", "b"]);
  assertEquals([...set.keys()], ["a", "b"]);
});

Deno.test("values returns all values", () => {
  const set = ImmutableSet.of(["a", "b"]);
  assertEquals([...set.values()], ["a", "b"]);
});

Deno.test("Symbol.iterator iterates values", () => {
  const set = ImmutableSet.of([10, 20]);
  const collected: number[] = [];
  for (const v of set) {
    collected.push(v);
  }
  assertEquals(collected, [10, 20]);
});

Deno.test("forEach visits every value", () => {
  const set = ImmutableSet.of([1, 2, 3]);
  const visited: number[] = [];
  set.forEach((v) => visited.push(v));
  assertEquals(visited, [1, 2, 3]);
});

// =============================================================================
// Immutable operations
// =============================================================================

Deno.test("add returns a new set with the value added", () => {
  const original = ImmutableSet.of([1, 2]);
  const updated = original.add(3);

  assertEquals(original.size, 2);
  assertEquals(updated.size, 3);
  assertEquals(updated.has(3), true);
});

Deno.test("add returns same instance when value already exists", () => {
  const set = ImmutableSet.of([1, 2]);
  const same = set.add(1);
  assertEquals(set === same, true);
});

Deno.test("delete returns a new set without the value", () => {
  const original = ImmutableSet.of([1, 2, 3]);
  const updated = original.delete(2);

  assertEquals(original.size, 3);
  assertEquals(updated.size, 2);
  assertFalse(updated.has(2));
});

Deno.test("delete returns same instance when value is absent", () => {
  const set = ImmutableSet.of([1, 2]);
  const same = set.delete(99);
  assertEquals(set === same, true);
});

Deno.test("map transforms values", () => {
  const original = ImmutableSet.of([1, 2, 3]);
  const doubled = original.map((v) => v * 2);

  assertEquals(doubled.size, 3);
  assertEquals(doubled.has(2), true);
  assertEquals(doubled.has(4), true);
  assertEquals(doubled.has(6), true);
  assertEquals(original.has(1), true); // original unchanged
});

Deno.test("map can change types", () => {
  const set = ImmutableSet.of([1, 2, 3]);
  const strings = set.map((v) => `item-${v}`);
  assertEquals(strings.has("item-1"), true);
  assertEquals(strings.has("item-2"), true);
});

Deno.test("filter keeps matching values", () => {
  const set = ImmutableSet.of([1, 2, 3, 4, 5]);
  const evens = set.filter((v) => v % 2 === 0);

  assertEquals(evens.size, 2);
  assertEquals(evens.has(2), true);
  assertEquals(evens.has(4), true);
});

Deno.test("intersect returns common values", () => {
  const a = ImmutableSet.of([1, 2, 3]);
  const b = ImmutableSet.of([2, 3, 4]);
  const result = a.intersect(b);

  assertEquals(result.size, 2);
  assertEquals(result.has(2), true);
  assertEquals(result.has(3), true);
});

Deno.test("toArray returns mutable array", () => {
  const set = ImmutableSet.of([3, 1, 2]);
  const arr = set.toArray();
  assertEquals(arr.length, 3);
  // Set preserves insertion order
  assertEquals(arr, [3, 1, 2]);
});

// =============================================================================
// ES2024 set operations
// =============================================================================

Deno.test("union returns combined set", () => {
  const a = ImmutableSet.of([1, 2]);
  const b = new Set([2, 3]);
  const result = a.union(b);
  assertEquals(result.size, 3);
});

Deno.test("intersection returns common elements", () => {
  const a = ImmutableSet.of([1, 2, 3]);
  const b = new Set([2, 3, 4]);
  const result = a.intersection(b);
  assertEquals(result.size, 2);
  assertEquals(result.has(2), true);
  assertEquals(result.has(3), true);
});

Deno.test("difference returns elements only in this set", () => {
  const a = ImmutableSet.of([1, 2, 3]);
  const b = new Set([2, 3, 4]);
  const result = a.difference(b);
  assertEquals(result.size, 1);
  assertEquals(result.has(1), true);
});

Deno.test("symmetricDifference returns elements in either but not both", () => {
  const a = ImmutableSet.of([1, 2, 3]);
  const b = new Set([2, 3, 4]);
  const result = a.symmetricDifference(b);
  assertEquals(result.size, 2);
  assertEquals(result.has(1), true);
  assertEquals(result.has(4), true);
});

Deno.test("isSubsetOf returns true for subsets", () => {
  const sub = ImmutableSet.of([1, 2]);
  const sup = new Set([1, 2, 3]);
  assertEquals(sub.isSubsetOf(sup), true);
  assertEquals(sub.isSubsetOf(new Set([1])), false);
});

Deno.test("isSupersetOf returns true for supersets", () => {
  const sup = ImmutableSet.of([1, 2, 3]);
  assertEquals(sup.isSupersetOf(new Set([1, 2])), true);
  assertEquals(sup.isSupersetOf(new Set([1, 4])), false);
});

Deno.test("isDisjointFrom returns true when no overlap", () => {
  const a = ImmutableSet.of([1, 2]);
  assertEquals(a.isDisjointFrom(new Set([3, 4])), true);
  assertEquals(a.isDisjointFrom(new Set([2, 3])), false);
});

// =============================================================================
// Builder
// =============================================================================

Deno.test("builder creates set via chaining", () => {
  const set = ImmutableSet.builder<number>()
    .add(1)
    .add(2)
    .add(3)
    .build();

  assertEquals(set.size, 3);
  assertEquals(set.has(2), true);
});

Deno.test("builder addAll adds multiple values", () => {
  const set = ImmutableSet.builder<number>()
    .add(1)
    .addAll([2, 3, 4])
    .build();

  assertEquals(set.size, 4);
});

Deno.test("builder delete removes value", () => {
  const set = ImmutableSet.builder<number>()
    .add(1)
    .add(2)
    .delete(1)
    .build();

  assertEquals(set.size, 1);
  assertFalse(set.has(1));
});

Deno.test("builder has and size reflect current state", () => {
  const builder = ImmutableSet.builder<number>()
    .add(1)
    .add(2);

  assertEquals(builder.has(1), true);
  assertFalse(builder.has(99));
  assertEquals(builder.size, 2);
});

Deno.test("toBuilder creates a builder from existing set", () => {
  const original = ImmutableSet.of([1, 2, 3]);
  const modified = original.toBuilder().add(4).delete(1).build();

  assertEquals(original.size, 3); // original unchanged
  assertEquals(modified.size, 3);
  assertEquals(modified.has(4), true);
  assertFalse(modified.has(1));
});

// =============================================================================
// Serialization
// =============================================================================

Deno.test("toJSON returns array", () => {
  const set = ImmutableSet.of([1, 2, 3]);
  assertEquals(set.toJSON(), [1, 2, 3]);
});

Deno.test("toString produces human-readable output", () => {
  const set = ImmutableSet.of([1, 2]);
  assertEquals(set.toString(), "ImmutableSet(2) { 1, 2 }");
});

Deno.test("toString for empty set", () => {
  const set = ImmutableSet.empty<number>();
  assertEquals(set.toString(), "ImmutableSet(0) {  }");
});

// =============================================================================
// Edge cases
// =============================================================================

Deno.test("works with string values", () => {
  const set = ImmutableSet.of(["hello", "world"]);
  assertEquals(set.has("hello"), true);
  assertEquals(set.size, 2);
});

Deno.test("chained immutable operations produce correct results", () => {
  const result = ImmutableSet.of([1, 2, 3, 4, 5])
    .add(6)
    .delete(1)
    .filter((v) => v % 2 === 0)
    .map((v) => v * 10);

  assertEquals(result.size, 3);
  assertEquals(result.has(20), true);
  assertEquals(result.has(40), true);
  assertEquals(result.has(60), true);
});
