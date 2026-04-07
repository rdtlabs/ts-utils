// =============================================================================
// Value Object Type Hierarchy
//
// Enforces immutable value objects with max 3 levels of nesting:
//   CompositeValueObject → ValueObject → ValuePrimitive
//
// Branding:
//   - Type level: phantom unique symbol (compile-time only, no JS emitted)
//   - Runtime level: private symbol in _internal.ts (never publicly exported)
// =============================================================================

// -----------------------------------------------------------------------------
// Phantom brand symbol — exists ONLY in the type system (no runtime value)
// -----------------------------------------------------------------------------

declare const VALUE_OBJECT_BRAND: unique symbol;

/** Type-only export of the phantom brand symbol. No runtime value exists. */
export type VALUE_OBJECT_BRAND = typeof VALUE_OBJECT_BRAND;

// -----------------------------------------------------------------------------
// Primitives
// -----------------------------------------------------------------------------

/** The set of primitive types allowed in value objects. */
export type ValuePrimitive = string | number | boolean | bigint | Date | null;

/** Discriminant values for the value object brand. */
export type ValueObjectKind = "flat" | "composite" | "map" | "set";

/** Creates a nominal/branded primitive type. The __brand property is compile-time only. */
export type Branded<
  T extends ValuePrimitive,
  B extends string,
> = T & { readonly __brand: B };

// -----------------------------------------------------------------------------
// Property validation (internal — not exported from index.ts)
// -----------------------------------------------------------------------------

/**
 * Validates that all properties of T are value primitives or readonly arrays
 * of value primitives. Used as the constraint for ValueObject<T>.
 */
export type ValidFlatProps<T> = {
  [K in keyof T]: T[K] extends ValuePrimitive | undefined ? T[K]
    : T[K] extends ReadonlyArray<ValuePrimitive> ? T[K]
    : never;
};

/**
 * Validates that all properties of T are value primitives, branded flat
 * ValueObjects, value collections, or readonly arrays thereof.
 * Used as the constraint for CompositeValueObject<T>.
 */
export type ValidCompositeProps<T> = {
  [K in keyof T]: T[K] extends ValuePrimitive | undefined ? T[K]
    : T[K] extends ReadonlyArray<ValuePrimitive> ? T[K]
    : T[K] extends { readonly [VALUE_OBJECT_BRAND]: "flat" } ? T[K]
    : T[K] extends ReadonlyArray<{ readonly [VALUE_OBJECT_BRAND]: "flat" }>
      ? T[K]
    : T[K] extends ReadonlyMap<infer MK, infer MV>
      ? MK extends ValuePrimitive
        ? MV extends { readonly [VALUE_OBJECT_BRAND]: "flat" } ? T[K]
        : never
      : never
    : T[K] extends ReadonlySet<infer SV>
      ? SV extends { readonly [VALUE_OBJECT_BRAND]: "flat" } ? T[K]
      : never
    : never;
};

// -----------------------------------------------------------------------------
// Value Object types
// -----------------------------------------------------------------------------

/**
 * A flat, immutable value object whose properties are all primitives
 * (or readonly arrays of primitives). Branded with "flat" to distinguish
 * from composites at the type level.
 *
 * @example
 * ```ts
 * type Address = ValueObject<{
 *   street: string;
 *   city: string;
 *   state: string;
 *   zip: string;
 * }>;
 * ```
 */
export type ValueObject<T extends ValidFlatProps<T>> = Readonly<T> & {
  readonly [VALUE_OBJECT_BRAND]: "flat";
};

/**
 * An immutable value object that can reference flat ValueObjects,
 * ValueMaps, ValueSets, and readonly arrays of ValueObjects.
 * Branded with "composite" — cannot be nested inside another composite.
 *
 * @example
 * ```ts
 * type Person = CompositeValueObject<{
 *   name: string;
 *   address: Address;
 *   pastAddresses: readonly Address[];
 *   tags: ValueSet<Address>;
 * }>;
 * ```
 */
export type CompositeValueObject<T extends ValidCompositeProps<T>> =
  & Readonly<T>
  & {
    readonly [VALUE_OBJECT_BRAND]: "composite";
  };

// -----------------------------------------------------------------------------
// Value collections
// -----------------------------------------------------------------------------

/** Immutable map with primitive keys and flat ValueObject values. */
export type ValueMap<
  K extends ValuePrimitive,
  V extends { readonly [VALUE_OBJECT_BRAND]: "flat" },
> = ReadonlyMap<K, V> & { readonly [VALUE_OBJECT_BRAND]: "map" };

/** Immutable set of flat ValueObjects. */
export type ValueSet<
  V extends { readonly [VALUE_OBJECT_BRAND]: "flat" },
> = ReadonlySet<V> & { readonly [VALUE_OBJECT_BRAND]: "set" };

/** Constraint type: matches any flat-branded value object. */
export type FlatBranded = { readonly [VALUE_OBJECT_BRAND]: "flat" };

// -----------------------------------------------------------------------------
// Union / base types
// -----------------------------------------------------------------------------

/** Matches any branded value object (flat or composite). */
export type AnyValueObject = {
  readonly [VALUE_OBJECT_BRAND]: "flat" | "composite";
};

/** Matches any branded value type including collections. */
export type AnyBrandedValue = {
  readonly [VALUE_OBJECT_BRAND]: "flat" | "composite" | "map" | "set";
};

// -----------------------------------------------------------------------------
// Exported Facade with runtime implementations
// ---------------------------------------------------------------------------

type ValueFacade = {
  /**
   * Creates an immutable, branded flat ValueObject from the given properties.
   * All properties must be primitives or readonly arrays of primitives.
   * The returned object is deeply frozen and branded.
   */
  object<T extends ValidFlatProps<T>>(
    props: T,
  ): ValueObject<T>;

  /**
   * Parses a JSON string and materializes it as a flat ValueObject.
   * The type parameter T is user-asserted (same semantics as JSON.parse).
   * Runtime validation ensures the shape is correct.
   */
  parseObject<T extends ValidFlatProps<T>>(
    json: string,
  ): ValueObject<T>;

  /**
   * Creates an immutable, branded CompositeValueObject from the given properties.
   * Properties can be primitives, flat ValueObjects (auto-materialized if plain),
   * ValueMaps, ValueSets, or readonly arrays thereof.
   * Already-branded nested objects are short-circuited (not re-frozen).
   */
  composite<T extends ValidCompositeProps<T>>(
    props: T,
  ): CompositeValueObject<T>;

  /**
   * Parses a JSON string and materializes it as a CompositeValueObject.
   * Nested plain objects are auto-materialized as flat ValueObjects at runtime.
   * The type parameter T is user-asserted (same semantics as JSON.parse).
   * Defaults to `any` when no type parameter is provided.
   */
  parseComposite<T extends ValidCompositeProps<T>>(
    json: string,
  ): CompositeValueObject<T>;

  /**
   * Creates an immutable, branded ValueMap from an iterable of entries.
   * Values that are plain objects are auto-materialized as flat ValueObjects.
   */
  map<
    K extends ValuePrimitive,
    V extends FlatBranded,
  >(
    entries: Iterable<[K, V]>,
  ): ValueMap<K, V>;

  /**
   * Creates an immutable, branded ValueMap from an iterable of entries.
   * Values that are plain objects are auto-materialized as flat ValueObjects.
   */
  set<
    V extends FlatBranded,
  >(
    items: Iterable<V>,
  ): ValueSet<V>;

  /** Returns true if the object is a branded value object (flat or composite). */
  isValueObject(obj: unknown): obj is AnyValueObject;

  /** Returns true if the object is any branded value type (including map/set). */
  isAny(obj: unknown): obj is AnyBrandedValue;

  /** Returns the brand kind of a branded value, or undefined if not branded. */
  getKind(obj: object): ValueObjectKind | undefined;

  /** Returns true if the object is a flat (primitive-only) value object. */
  isFlat(obj: unknown): boolean;

  /** Returns true if the object is a composite value object. */
  isComposite(obj: unknown): boolean;

  /**
   * Compares two branded value objects for deep structural equality.
   * Returns `false` if either argument is not a branded value type.
   */
  equals(a: unknown, b: unknown): boolean;
};

import {
  compositeValueObjectFromJSON,
  createCompositeValueObject,
  createValueMap,
  createValueObject,
  createValueSet,
  getValueKind,
  isBrandedValue,
  isFlatValueObject,
  isValueObject,
  valueEquals,
  valueObjectFromJSON,
} from "./value.ts";

export const ValueObject: ValueFacade = Object.freeze({
  object<T extends ValidFlatProps<T>>(
    props: T,
  ): ValueObject<T> {
    return createValueObject(props);
  },

  parseObject<T extends ValidFlatProps<T>>(
    props: string,
  ): ValueObject<T> {
    return valueObjectFromJSON(props);
  },

  composite<T extends ValidCompositeProps<T>>(
    props: T,
  ): CompositeValueObject<T> {
    return createCompositeValueObject(props);
  },

  parseComposite<T extends ValidCompositeProps<T>>(
    props: string,
  ): CompositeValueObject<T> {
    return compositeValueObjectFromJSON(props);
  },

  map<
    K extends ValuePrimitive,
    V extends FlatBranded,
  >(
    entries: Iterable<[K, V]>,
  ): ValueMap<K, V> {
    return createValueMap(entries);
  },

  set<
    V extends FlatBranded,
  >(
    items: Iterable<V>,
  ): ValueSet<V> {
    return createValueSet(items);
  },

  isValueObject(obj: unknown): obj is AnyValueObject {
    return isValueObject(obj);
  },

  isAny(obj: unknown): obj is AnyBrandedValue {
    return isBrandedValue(obj);
  },

  getKind(obj: object): ValueObjectKind | undefined {
    return getValueKind(obj);
  },

  isFlat(obj: unknown): boolean {
    return isFlatValueObject(obj);
  },

  isComposite(obj: unknown): boolean {
    return !isFlatValueObject(obj) && isValueObject(obj);
  },

  equals(a: unknown, b: unknown): boolean {
    return valueEquals(a, b);
  },
});
