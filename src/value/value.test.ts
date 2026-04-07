import { assertEquals, assertThrows } from "@std/assert";
import {
  compositeValueObjectFromJSON,
  createCompositeValueObject,
  createValueMap,
  createValueObject,
  createValueSet,
  getValueKind,
  isBrandedValue,
  isCompositeValueObject,
  isFlatValueObject,
  isValueObject,
  valueObjectFromJSON,
} from "./value.ts";

import type {
  Branded,
  CompositeValueObject,
  ValueMap,
  ValueObject,
  ValueSet,
} from "./types.ts";

// =============================================================================
// Type-level tests — these verify compile-time constraints.
// If this file compiles, the constraints are working.
// =============================================================================

// --- Branded primitives ---

type UserId = Branded<string, "UserId">;
type Email = Branded<string, "Email">;
type Dollars = Branded<number, "Dollars">;

// --- Flat ValueObject: only primitives + readonly primitive arrays ---

type Address = ValueObject<{
  street: string;
  city: string;
  state: string;
  zip: string;
}>;

type Money = ValueObject<{
  amount: Dollars;
  currency: string;
}>;

type TaggedItem = ValueObject<{
  name: string;
  tags: readonly string[];
  scores: readonly number[];
}>;

type WithOptional = ValueObject<{
  required: string;
  optional?: string;
}>;

type WithNull = ValueObject<{
  name: string;
  deletedAt: Date | null;
}>;

// --- CompositeValueObject: primitives + flat ValueObjects + collections ---

type Person = CompositeValueObject<{
  id: UserId;
  name: string;
  age: number;
  email: Email;
  address: Address;
  billing: Money;
  pastAddresses: readonly Address[];
  tags: readonly string[];
}>;

type WithValueMap = CompositeValueObject<{
  name: string;
  addressBook: ValueMap<string, Address>;
}>;

type WithValueSet = CompositeValueObject<{
  name: string;
  uniqueAddresses: ValueSet<Address>;
}>;

type WithAllCollections = CompositeValueObject<{
  name: string;
  primary: Address;
  addresses: readonly Address[];
  lookup: ValueMap<string, Address>;
  uniques: ValueSet<Address>;
  simpleTags: readonly string[];
}>;

// --- Negative tests (these should NOT compile) ---

// @ts-expect-error — plain object is not a ValuePrimitive
type _Bad1 = ValueObject<{ nested: { foo: string } }>;

// @ts-expect-error — composite cannot nest inside composite
type _Bad2 = CompositeValueObject<{ person: Person }>;

// @ts-expect-error — array of plain objects is not allowed in flat
type _Bad3 = ValueObject<{ items: readonly { x: number }[] }>;

// @ts-expect-error — non-branded object not allowed in composite
type _Bad4 = CompositeValueObject<{
  name: string;
  data: { foo: string };
}>;

// Suppress unused type warnings
const _useTypes: [
  Address?,
  Money?,
  TaggedItem?,
  WithOptional?,
  WithNull?,
  Person?,
  WithValueMap?,
  WithValueSet?,
  WithAllCollections?,
  _Bad1?,
  _Bad2?,
  _Bad3?,
  _Bad4?,
] = [];
void _useTypes;

// =============================================================================
// Factory tests — createValueObject
// =============================================================================

Deno.test("createValueObject produces a frozen, branded flat object", () => {
  const addr: Address = createValueObject({
    street: "123 Main",
    city: "NYC",
    state: "NY",
    zip: "10001",
  });

  assertEquals(addr.street, "123 Main");
  assertEquals(addr.city, "NYC");
  assertEquals(Object.isFrozen(addr), true);
  assertEquals(isFlatValueObject(addr), true);
  assertEquals(getValueKind(addr), "flat");
});

Deno.test("createValueObject freezes nested arrays", () => {
  const tagged = createValueObject({
    name: "item",
    tags: ["a", "b", "c"],
  });

  assertEquals(Object.isFrozen(tagged.tags), true);
  assertEquals(tagged.tags.length, 3);
});

Deno.test("createValueObject allows Date values", () => {
  const obj = createValueObject({
    name: "test",
    createdAt: new Date("2024-01-01"),
  });

  assertEquals(obj.createdAt instanceof Date, true);
  assertEquals(Object.isFrozen(obj), true);
});

Deno.test("createValueObject allows null values", () => {
  const obj = createValueObject({
    name: "test",
    deletedAt: null,
  });

  assertEquals(obj.deletedAt, null);
});

Deno.test("createValueObject rejects nested objects at runtime", () => {
  assertThrows(
    () =>
      createValueObject({
        name: "bad",
        nested: { foo: "bar" },
      } as Record<string, unknown> as Parameters<typeof createValueObject>[0]),
    TypeError,
    "must be a primitive",
  );
});

// =============================================================================
// Factory tests — createCompositeValueObject
// =============================================================================

Deno.test("createCompositeValueObject with pre-branded nested value objects", () => {
  const addr: Address = createValueObject({
    street: "123 Main",
    city: "NYC",
    state: "NY",
    zip: "10001",
  });

  const person = createCompositeValueObject({
    name: "Alice",
    age: 30,
    address: addr,
  });

  assertEquals(person.name, "Alice");
  assertEquals(person.address.street, "123 Main");
  assertEquals(Object.isFrozen(person), true);
  assertEquals(isCompositeValueObject(person), true);
  assertEquals(getValueKind(person), "composite");
  // Nested object was already branded — should still be
  assertEquals(isFlatValueObject(person.address), true);
});

Deno.test("createCompositeValueObject auto-materializes plain nested objects", () => {
  const person = createCompositeValueObject({
    name: "Bob",
    address: { street: "456 Oak", city: "LA", state: "CA", zip: "90001" },
  } as Parameters<typeof createCompositeValueObject>[0]);

  assertEquals(Object.isFrozen(person), true);
  assertEquals(isCompositeValueObject(person), true);
  // The nested plain object should now be branded as flat
  assertEquals(isFlatValueObject(person.address), true);
  assertEquals(Object.isFrozen(person.address), true);
});

Deno.test("createCompositeValueObject auto-materializes objects in arrays", () => {
  const addr1 = createValueObject({
    street: "1st",
    city: "A",
    state: "NY",
    zip: "00001",
  });

  const person = createCompositeValueObject({
    name: "Carol",
    addresses: [
      addr1,
      { street: "2nd", city: "B", state: "CA", zip: "00002" },
    ],
  } as Parameters<typeof createCompositeValueObject>[0]);

  assertEquals(Object.isFrozen(person.addresses), true);
  assertEquals(isFlatValueObject(person.addresses[0]), true);
  assertEquals(isFlatValueObject(person.addresses[1]), true);
});

Deno.test("createCompositeValueObject short-circuits already-branded objects", () => {
  const addr = createValueObject({
    street: "123 Main",
    city: "NYC",
    state: "NY",
    zip: "10001",
  });

  // The address is already branded+frozen — should not be re-processed
  const person = createCompositeValueObject({
    name: "Dave",
    address: addr,
  });

  // Same reference since it was short-circuited (spread copies the ref)
  assertEquals(person.address.street, "123 Main");
  assertEquals(isFlatValueObject(person.address), true);
});

// =============================================================================
// Factory tests — createValueMap / createValueSet
// =============================================================================

Deno.test("createValueMap creates a branded map with frozen values", () => {
  const addr = createValueObject({
    street: "123",
    city: "NYC",
    state: "NY",
    zip: "10001",
  });

  const map = createValueMap([["home", addr]]);

  assertEquals(isBrandedValue(map), true);
  assertEquals(getValueKind(map), "map");
  assertEquals(map.get("home")?.street, "123");
});

Deno.test("createValueMap throws on mutation", () => {
  const addr = createValueObject({ street: "1", city: "A", state: "B", zip: "0" });
  const map = createValueMap([["home", addr]]);

  assertThrows(() => (map as unknown as Map<string, unknown>).set("work", addr), TypeError, "frozen");
  assertThrows(() => (map as unknown as Map<string, unknown>).delete("home"), TypeError, "frozen");
  assertThrows(() => (map as unknown as Map<string, unknown>).clear(), TypeError, "frozen");
});

Deno.test("createValueSet creates a branded set with frozen values", () => {
  const addr = createValueObject({
    street: "123",
    city: "NYC",
    state: "NY",
    zip: "10001",
  });

  const set = createValueSet([addr]);

  assertEquals(isBrandedValue(set), true);
  assertEquals(getValueKind(set), "set");
  assertEquals(set.size, 1);
});

Deno.test("createValueSet throws on mutation", () => {
  const addr = createValueObject({ street: "1", city: "A", state: "B", zip: "0" });
  const set = createValueSet([addr]);

  assertThrows(() => (set as unknown as Set<unknown>).add(addr), TypeError, "frozen");
  assertThrows(() => (set as unknown as Set<unknown>).delete(addr), TypeError, "frozen");
  assertThrows(() => (set as unknown as Set<unknown>).clear(), TypeError, "frozen");
});

// =============================================================================
// Factory tests — fromJSON
// =============================================================================

Deno.test("valueObjectFromJSON materializes from JSON string", () => {
  const json = '{"street":"789 Pine","city":"CHI","state":"IL","zip":"60601"}';
  const addr = valueObjectFromJSON<{
    street: string;
    city: string;
    state: string;
    zip: string;
  }>(json);

  assertEquals(addr.street, "789 Pine");
  assertEquals(Object.isFrozen(addr), true);
  assertEquals(isFlatValueObject(addr), true);
});

Deno.test("compositeValueObjectFromJSON materializes nested objects", () => {
  const json =
    '{"name":"Eve","address":{"street":"321 Elm","city":"SF","state":"CA","zip":"94101"}}';
  // No explicit type param — defaults to any. Runtime validation is the safety net.
  const person = compositeValueObjectFromJSON(json);

  assertEquals(person.name, "Eve");
  assertEquals(Object.isFrozen(person), true);
  assertEquals(isCompositeValueObject(person), true);
  assertEquals(isFlatValueObject(person.address), true);
});

// =============================================================================
// Guard tests
// =============================================================================

Deno.test("isValueObject returns false for plain objects", () => {
  assertEquals(isValueObject({ name: "test" }), false);
  assertEquals(isValueObject(null), false);
  assertEquals(isValueObject(undefined), false);
  assertEquals(isValueObject(42), false);
  assertEquals(isValueObject("string"), false);
});

Deno.test("brand is not visible via Object.keys or JSON.stringify", () => {
  const obj = createValueObject({ name: "test", age: 30 });

  assertEquals(Object.keys(obj), ["name", "age"]);
  assertEquals(JSON.stringify(obj), '{"name":"test","age":30}');
});

Deno.test("spoofed symbol does not match runtime brand", () => {
  const fake = { name: "spoofed", [Symbol("ValueObject")]: "flat" };

  assertEquals(isValueObject(fake), false);
  assertEquals(getValueKind(fake), undefined);
});

Deno.test("brand cannot be overwritten on frozen value object", () => {
  const obj = createValueObject({ name: "immutable" });

  try {
    (obj as Record<string, unknown>)["name"] = "changed";
  } catch {
    // Expected in strict mode
  }
  assertEquals(obj.name, "immutable");
});

// =============================================================================
// ValueObject public API tests (types.ts const ValueObject)
// =============================================================================

import { VO } from "./index.ts";

Deno.test("ValueObject.from creates a frozen, branded flat object", () => {
  const addr: Address = VO.object({
    street: "123 Main",
    city: "NYC",
    state: "NY",
    zip: "10001",
  });

  assertEquals(addr.street, "123 Main");
  assertEquals(Object.isFrozen(addr), true);
  assertEquals(VO.isFlat(addr), true);
  assertEquals(VO.getKind(addr), "flat");
});

Deno.test("ValueObject.from parses JSON string", () => {
  const json = '{"street":"789 Pine","city":"CHI","state":"IL","zip":"60601"}';
  const addr = VO.parseObject<Address>(json);

  assertEquals(addr.street, "789 Pine");
  assertEquals(Object.isFrozen(addr), true);
  assertEquals(VO.isFlat(addr), true);
});

Deno.test("ValueObject.composite creates a branded composite object", () => {
  const addr: Address = VO.object({
    street: "1st",
    city: "A",
    state: "NY",
    zip: "00001",
  });

  const person = VO.composite({
    name: "Alice",
    age: 30,
    address: addr,
  });

  assertEquals(person.name, "Alice");
  assertEquals(person.address.street, "1st");
  assertEquals(Object.isFrozen(person), true);
  assertEquals(VO.isComposite(person), true);
  assertEquals(VO.getKind(person), "composite");
});

Deno.test("ValueObject.composite parses JSON string", () => {
  const json =
    '{"name":"Eve","address":{"street":"321 Elm","city":"SF","state":"CA","zip":"94101"}}';
  const person = VO.parseComposite<Person>(json);

  assertEquals(person.name, "Eve");
  assertEquals(Object.isFrozen(person), true);
  assertEquals(VO.isComposite(person), true);
  assertEquals(VO.isFlat(person.address), true);
});

Deno.test("ValueObject.map creates a branded map", () => {
  const addr = VO.object({
    street: "123",
    city: "NYC",
    state: "NY",
    zip: "10001",
  });

  const map = VO.map([["home", addr]]);

  assertEquals(VO.isAny(map), true);
  assertEquals(VO.getKind(map), "map");
  assertEquals(map.get("home")?.street, "123");
  assertEquals(map.size, 1);
});

Deno.test("ValueObject.set creates a branded set", () => {
  const addr = VO.object({
    street: "123",
    city: "NYC",
    state: "NY",
    zip: "10001",
  });

  const set = VO.set([addr]);

  assertEquals(VO.isAny(set), true);
  assertEquals(VO.getKind(set), "set");
  assertEquals(set.size, 1);
});

Deno.test("ValueObject.isValueObject distinguishes flat and composite from non-branded", () => {
  const flat = VO.object({ name: "flat" });
  const composite = VO.composite({ name: "composite", nested: flat });

  assertEquals(VO.isValueObject(flat), true);
  assertEquals(VO.isValueObject(composite), true);
  assertEquals(VO.isValueObject({ name: "plain" }), false);
  assertEquals(VO.isValueObject(null), false);
  assertEquals(VO.isValueObject(42), false);
});

Deno.test("ValueObject.isAny detects all branded types including map and set", () => {
  const flat = VO.object({ x: 1 });
  const composite = VO.composite({ x: 1, nested: flat });
  const map = VO.map([["a", flat]]);
  const set = VO.set([flat]);

  assertEquals(VO.isAny(flat), true);
  assertEquals(VO.isAny(composite), true);
  assertEquals(VO.isAny(map), true);
  assertEquals(VO.isAny(set), true);
  assertEquals(VO.isAny({}), false);
});

Deno.test("ValueObject.isFlat and isComposite are mutually exclusive", () => {
  const flat = VO.object({ name: "flat" });
  const composite = VO.composite({ name: "composite", nested: flat });

  assertEquals(VO.isFlat(flat), true);
  assertEquals(VO.isComposite(flat), false);
  assertEquals(VO.isFlat(composite), false);
  assertEquals(VO.isComposite(composite), true);
});

Deno.test("ValueObject.getKind returns undefined for non-branded objects", () => {
  assertEquals(VO.getKind({}), undefined);
  assertEquals(VO.getKind(new Map()), undefined);
});

Deno.test("ValueObject const is frozen", () => {
  assertEquals(Object.isFrozen(VO), true);
});
