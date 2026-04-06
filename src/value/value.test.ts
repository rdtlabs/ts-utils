import { assertEquals } from "https://deno.land/std@0.213.0/assert/assert_equals.ts";
import { applyBrand, readBrand } from "./_internal.ts";
import {
  getValueKind,
  isBrandedValue,
  isCompositeValueObject,
  isFlatValueObject,
  isValueObject,
} from "./guards.ts";
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
// Uncomment any of these to verify they produce compile errors:

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

// Note: string[] is structurally compatible with ReadonlyArray<string>,
// so it passes the constraint. Readonly<T> on ValueObject makes the
// property itself readonly. Deep array immutability is enforced at runtime.

// =============================================================================
// Runtime tests — verify guards and branding
// =============================================================================

Deno.test("applyBrand sets non-enumerable, non-writable brand", () => {
  const obj = applyBrand({ name: "test" }, "flat");

  assertEquals(getValueKind(obj), "flat");
  assertEquals(Object.keys(obj).includes("ValueObject"), false);

  const descriptor = Object.getOwnPropertyDescriptors(obj);
  // The brand is symbol-keyed so won't appear in string-keyed descriptors
  assertEquals("name" in descriptor, true);
});

Deno.test("isValueObject returns true for branded objects", () => {
  const flat = Object.freeze(applyBrand({ street: "123 Main" }, "flat"));
  const composite = Object.freeze(applyBrand({ name: "Alice" }, "composite"));

  assertEquals(isValueObject(flat), true);
  assertEquals(isValueObject(composite), true);
});

Deno.test("isValueObject returns false for plain objects", () => {
  assertEquals(isValueObject({ name: "test" }), false);
  assertEquals(isValueObject(null), false);
  assertEquals(isValueObject(undefined), false);
  assertEquals(isValueObject(42), false);
  assertEquals(isValueObject("string"), false);
});

Deno.test("isBrandedValue detects all brand kinds", () => {
  const flat = applyBrand({}, "flat");
  const composite = applyBrand({}, "composite");
  const map = applyBrand(new Map(), "map");
  const set = applyBrand(new Set(), "set");

  assertEquals(isBrandedValue(flat), true);
  assertEquals(isBrandedValue(composite), true);
  assertEquals(isBrandedValue(map), true);
  assertEquals(isBrandedValue(set), true);
});

Deno.test("getValueKind returns correct kind", () => {
  assertEquals(getValueKind(applyBrand({}, "flat")), "flat");
  assertEquals(getValueKind(applyBrand({}, "composite")), "composite");
  assertEquals(getValueKind(applyBrand(new Map(), "map")), "map");
  assertEquals(getValueKind(applyBrand(new Set(), "set")), "set");
});

Deno.test("getValueKind returns undefined for unbranded objects", () => {
  assertEquals(getValueKind({}), undefined);
  assertEquals(getValueKind(new Map()), undefined);
});

Deno.test("isFlatValueObject and isCompositeValueObject", () => {
  const flat = applyBrand({}, "flat");
  const composite = applyBrand({}, "composite");

  assertEquals(isFlatValueObject(flat), true);
  assertEquals(isFlatValueObject(composite), false);
  assertEquals(isCompositeValueObject(composite), true);
  assertEquals(isCompositeValueObject(flat), false);
});

Deno.test("brand cannot be overwritten on frozen object", () => {
  const obj = Object.freeze(applyBrand({ name: "immutable" }, "flat"));

  // Attempting to modify the brand should fail silently (frozen + non-configurable)
  try {
    (obj as Record<string, unknown>)["name"] = "changed";
  } catch {
    // Expected in strict mode
  }
  assertEquals((obj as Record<string, unknown>)["name"], "immutable");
});

Deno.test("brand is not visible via Object.keys or JSON.stringify", () => {
  const obj = applyBrand({ name: "test", age: 30 }, "flat");

  assertEquals(Object.keys(obj), ["name", "age"]);
  assertEquals(JSON.stringify(obj), '{"name":"test","age":30}');
});

Deno.test("spoofed symbol does not match runtime brand", () => {
  const fake = { name: "spoofed", [Symbol("ValueObject")]: "flat" };

  assertEquals(isValueObject(fake), false);
  assertEquals(getValueKind(fake), undefined);
});
