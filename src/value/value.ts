// =============================================================================
// Value Object runtime — brand symbol, guards, and (future) factory
//
// The runtime brand symbol is a module-scoped const. It is NEVER exported.
// No other file can import it, so no dev can accidentally brand an object
// or spoof the brand. All external access goes through the exported guards.
// =============================================================================

import type {
  AnyBrandedValue,
  AnyValueObject,
  FlatBranded,
  ValueObjectKind,
} from "./types.ts";

import { ImmutableMap } from "../collections/ImmutableMap.ts";
import { ImmutableSet } from "../collections/ImmutableSet.ts";

// -----------------------------------------------------------------------------
// Private brand symbol — closure-scoped, unreachable from outside this module
// -----------------------------------------------------------------------------

const _brand: unique symbol = Symbol("ValueObject");

// -----------------------------------------------------------------------------
// Exported guards
// -----------------------------------------------------------------------------

/** Returns true if the object is a branded value object (flat or composite). */
export function isValueObject(obj: unknown): obj is AnyValueObject {
  const kind = tryReadBrand(obj);
  return kind === "flat" || kind === "composite";
}

/** Returns true if the object is any branded value type (including map/set). */
export function isBrandedValue(obj: unknown): obj is AnyBrandedValue {
  return hasBrand(obj);
}

/** Returns the brand kind of a branded value, or undefined if not branded. */
export function getValueKind(obj: object): ValueObjectKind | undefined {
  return readBrand(obj);
}

/** Returns true if the object is a flat (primitive-only) value object. */
export function isFlatValueObject(obj: unknown): boolean {
  return tryReadBrand(obj) === "flat";
}

/** Returns true if the object is a composite value object. */
export function isCompositeValueObject(obj: unknown): boolean {
  return tryReadBrand(obj) === "composite";
}

// -----------------------------------------------------------------------------
// Factory functions — the ONLY way to create branded value objects
// -----------------------------------------------------------------------------

import type {
  CompositeValueObject,
  ValidCompositeProps,
  ValidFlatProps,
  ValueMap,
  ValueObject,
  ValuePrimitive,
  ValueSet,
} from "./types.ts";

/**
 * Creates an immutable, branded flat ValueObject from the given properties.
 * All properties must be primitives or readonly arrays of primitives.
 * The returned object is deeply frozen and branded.
 */
export function createValueObject<T extends ValidFlatProps<T>>(
  props: T,
): ValueObject<T> {
  const obj = { ...props } as Record<string, unknown>;
  deepFreezeValues(obj);
  applyBrand(obj, "flat");
  Object.freeze(obj);
  return obj as unknown as ValueObject<T>;
}

/**
 * Creates an immutable, branded CompositeValueObject from the given properties.
 * Properties can be primitives, flat ValueObjects (auto-materialized if plain),
 * ValueMaps, ValueSets, or readonly arrays thereof.
 * Already-branded nested objects are short-circuited (not re-frozen).
 */
export function createCompositeValueObject<T extends ValidCompositeProps<T>>(
  props: T,
): CompositeValueObject<T> {
  const obj = { ...props } as Record<string, unknown>;
  validateAndFreezeCompositeProps(obj);
  applyBrand(obj, "composite");
  Object.freeze(obj);
  return obj as unknown as CompositeValueObject<T>;
}

/**
 * Creates an immutable, branded ValueMap from an iterable of entries.
 * Values that are plain objects are auto-materialized as flat ValueObjects.
 */
export function createValueMap<
  K extends ValuePrimitive,
  V extends FlatBranded,
>(
  entries: Iterable<[K, V]>,
): ValueMap<K, V> {
  if (entries instanceof ImmutableMap) {
    entries.forEach((v) => {
      if (typeof v === "object" && v !== null && !hasBrand(v)) {
        materializeNestedValueObject(v as Record<string, unknown>);
      }
    });
    applyBrand(entries, "map");
    return entries as unknown as ValueMap<K, V>;
  }

  const map = new Map<K, V>();
  for (const [k, v] of entries) {
    const materialized = typeof v === "object" && v !== null && !hasBrand(v)
      ? materializeNestedValueObject(v as Record<string, unknown>)
      : v;
    map.set(k, materialized as V);
  }
  applyBrand(map, "map");
  freezeMap(map as Map<unknown, unknown>);
  return map as unknown as ValueMap<K, V>;
}

/**
 * Creates an immutable, branded ValueMap from an iterable of entries.
 * Values that are plain objects are auto-materialized as flat ValueObjects.
 */
export function createValueSet<
  V extends FlatBranded,
>(
  items: Iterable<V>,
): ValueSet<V> {
  if (items instanceof ImmutableSet) {
    items.forEach((v) => {
      if (typeof v === "object" && v !== null && !hasBrand(v)) {
        materializeNestedValueObject(v as Record<string, unknown>);
      }
    });
    applyBrand(items, "set");
    return items as unknown as ValueSet<V>;
  }

  const set = new Set<V>();
  for (const v of items) {
    const materialized = typeof v === "object" && v !== null && !hasBrand(v)
      ? materializeNestedValueObject(v as Record<string, unknown>)
      : v;
    set.add(materialized as V);
  }
  applyBrand(set, "set");
  freezeSet(set as Set<unknown>);
  return set as unknown as ValueSet<V>;
}

/**
 * Parses a JSON string and materializes it as a flat ValueObject.
 * The type parameter T is user-asserted (same semantics as JSON.parse).
 * Runtime validation ensures the shape is correct.
 */
export function valueObjectFromJSON<T extends ValidFlatProps<T>>(
  json: string,
): ValueObject<T> {
  // deno-lint-ignore no-explicit-any
  return createValueObject(JSON.parse(json) as any) as unknown as ValueObject<
    T
  >;
}

/**
 * Parses a JSON string and materializes it as a CompositeValueObject.
 * Nested plain objects are auto-materialized as flat ValueObjects at runtime.
 * The type parameter T is user-asserted (same semantics as JSON.parse).
 * Defaults to `any` when no type parameter is provided.
 */
export function compositeValueObjectFromJSON<
  // deno-lint-ignore no-explicit-any
  T extends ValidCompositeProps<T> = any,
>(
  json: string,
): CompositeValueObject<T> {
  // deno-lint-ignore no-explicit-any
  const parsed = JSON.parse(json) as any;
  const obj = { ...parsed } as Record<string, unknown>;
  validateAndFreezeCompositeProps(obj);
  applyBrand(obj, "composite");
  Object.freeze(obj);
  return obj as unknown as CompositeValueObject<T>;
}

// -----------------------------------------------------------------------------
// Internal helpers (not exported)
// -----------------------------------------------------------------------------

function applyBrand<T extends object>(obj: T, kind: ValueObjectKind): T {
  Object.defineProperty(obj, _brand, {
    value: kind,
    enumerable: false,
    writable: false,
    configurable: false,
  });
  return obj;
}

function readBrand(obj: object): ValueObjectKind | undefined {
  return (obj as Record<symbol, unknown>)[_brand] as
    | ValueObjectKind
    | undefined;
}

function tryReadBrand(obj: unknown): ValueObjectKind | undefined {
  if (typeof obj === "object" && obj !== null) {
    return (obj as Record<symbol, unknown>)[_brand] as ValueObjectKind;
  }

  return undefined;
}

function hasBrand(obj: unknown): boolean {
  return typeof obj === "object" && obj !== null && _brand in obj;
}

// -----------------------------------------------------------------------------
// Materialization helpers (not exported — used only by factory functions below)
// -----------------------------------------------------------------------------

function isPrimitive(value: unknown): boolean {
  if (value === null) return true;
  const t = typeof value;
  return t === "string" || t === "number" || t === "boolean" || t === "bigint";
}

function isPrimitiveOrDate(value: unknown): boolean {
  return isPrimitive(value) || value instanceof Date;
}

function throwFrozen(kind: string): never {
  throw new TypeError(`Cannot modify a frozen ${kind}`);
}

/** Seals a Map so mutation methods throw, then freezes the object. */
function freezeMap(map: Map<unknown, unknown>): void {
  map.set = () => throwFrozen("ValueMap");
  map.delete = () => throwFrozen("ValueMap");
  map.clear = () => throwFrozen("ValueMap");
  Object.freeze(map);
}

/** Seals a Set so mutation methods throw, then freezes the object. */
function freezeSet(set: Set<unknown>): void {
  set.add = () => throwFrozen("ValueSet");
  set.delete = () => throwFrozen("ValueSet");
  set.clear = () => throwFrozen("ValueSet");
  Object.freeze(set);
}

function deepFreezeArray(arr: readonly unknown[]): void {
  for (const item of arr) {
    if (typeof item === "object" && item !== null && !Object.isFrozen(item)) {
      Object.freeze(item);
    }
  }
  Object.freeze(arr);
}

/** Freezes nested values (arrays, dates) but NOT the top-level object itself. */
function deepFreezeValues(obj: Record<string, unknown>): void {
  validateFlatProps(obj);
  for (const value of Object.values(obj)) {
    if (Object.isFrozen(value)) {
      continue;
    }

    if (Array.isArray(value)) {
      deepFreezeArray(value);
    }

    if (value instanceof Date) {
      Object.freeze(value);
    }
  }
}

function validateFlatProps(obj: Record<string, unknown>): void {
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;
    if (isPrimitiveOrDate(value)) continue;
    if (Array.isArray(value)) {
      for (const item of value) {
        if (!isPrimitiveOrDate(item)) {
          throw new TypeError(
            `ValueObject property "${key}" contains a non-primitive array element: ${typeof item}`,
          );
        }
      }
      continue;
    }
    throw new TypeError(
      `ValueObject property "${key}" must be a primitive or readonly primitive array, got: ${typeof value}`,
    );
  }
}

function materializeNestedValueObject(
  obj: Record<string, unknown>,
): Record<string, unknown> {
  // Already branded — short-circuit
  if (hasBrand(obj)) return obj;

  deepFreezeValues(obj);
  applyBrand(obj, "flat");
  Object.freeze(obj);
  return obj;
}

function validateAndFreezeCompositeProps(
  obj: Record<string, unknown>,
): void {
  for (const [key, val] of Object.entries(obj)) {
    // Use an explicit `unknown` binding to prevent TypeScript from
    // narrowing to `never` after successive type-guard continues.
    const value: unknown = val;

    if (value === undefined || isPrimitiveOrDate(value)) continue;

    // Already branded value object — short-circuit
    if (hasBrand(value)) continue;

    // Array
    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        const item: unknown = value[i];
        if (isPrimitiveOrDate(item) || item === undefined) continue;
        if (typeof item === "object" && item !== null) {
          // Auto-materialize plain objects in arrays as flat value objects
          value[i] = materializeNestedValueObject(
            item as Record<string, unknown>,
          );
          continue;
        }
        throw new TypeError(
          `CompositeValueObject property "${key}[${i}]" contains an invalid value: ${typeof item}`,
        );
      }
      Object.freeze(value);
      continue;
    }

    // Map
    if (value instanceof Map || value instanceof ImmutableMap) {
      for (const [mk, mv] of (value as Map<unknown, unknown>).entries()) {
        if (!isPrimitiveOrDate(mk)) {
          throw new TypeError(
            `CompositeValueObject property "${key}" map key must be a primitive, got: ${typeof mk}`,
          );
        }
        if (typeof mv === "object" && mv !== null && !hasBrand(mv)) {
          // Auto-materialize unbranded map values
          materializeNestedValueObject(mv as Record<string, unknown>);
        }
      }
      continue;
    }

    // Set
    if (value instanceof Set || value instanceof ImmutableSet) {
      for (const sv of value as Set<unknown>) {
        if (typeof sv === "object" && sv !== null && !hasBrand(sv)) {
          materializeNestedValueObject(sv as Record<string, unknown>);
        }
      }
      continue;
    }

    // Plain object — auto-materialize as flat value object
    if (typeof value === "object") {
      obj[key] = materializeNestedValueObject(
        value as Record<string, unknown>,
      );
      continue;
    }

    throw new TypeError(
      `CompositeValueObject property "${key}" has an invalid type: ${typeof value}`,
    );
  }
}
