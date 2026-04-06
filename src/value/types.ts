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
  [K in keyof T]: T[K] extends ValuePrimitive | undefined
    ? T[K]
    : T[K] extends ReadonlyArray<ValuePrimitive>
      ? T[K]
      : never;
};

/**
 * Validates that all properties of T are value primitives, branded flat
 * ValueObjects, value collections, or readonly arrays thereof.
 * Used as the constraint for CompositeValueObject<T>.
 */
export type ValidCompositeProps<T> = {
  [K in keyof T]: T[K] extends ValuePrimitive | undefined
    ? T[K]
    : T[K] extends ReadonlyArray<ValuePrimitive>
      ? T[K]
      : T[K] extends { readonly [VALUE_OBJECT_BRAND]: "flat" }
        ? T[K]
        : T[K] extends ReadonlyArray<{ readonly [VALUE_OBJECT_BRAND]: "flat" }>
          ? T[K]
          : T[K] extends ReadonlyMap<infer MK, infer MV>
            ? MK extends ValuePrimitive
              ? MV extends { readonly [VALUE_OBJECT_BRAND]: "flat" }
                ? T[K]
                : never
              : never
            : T[K] extends ReadonlySet<infer SV>
              ? SV extends { readonly [VALUE_OBJECT_BRAND]: "flat" }
                ? T[K]
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
  Readonly<T> & {
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

// -----------------------------------------------------------------------------
// Union / base types
// -----------------------------------------------------------------------------

/** Matches any branded value object (flat or composite). */
export type AnyValueObject = { readonly [VALUE_OBJECT_BRAND]: "flat" | "composite" };

/** Matches any branded value type including collections. */
export type AnyBrandedValue = {
  readonly [VALUE_OBJECT_BRAND]: "flat" | "composite" | "map" | "set";
};
