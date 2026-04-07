// ============================================================================
// Immutable Collections with Builder Pattern
// ============================================================================

// ---------------------------------------------------------------------------
// ImmutableSet
// ---------------------------------------------------------------------------

/**
 * A persistent, immutable set. All mutation operations return new instances,
 * leaving the original unchanged. Implements {@linkcode ReadonlySet} and
 * {@linkcode Iterable} for interop with standard library code.
 *
 * Delegates ES2024 set operations (`union`, `intersection`, `difference`, etc.)
 * to the underlying `Set`.
 *
 * Create instances via the static factory methods:
 *
 * @example
 * ```ts
 * const empty = ImmutableSet.empty<number>();
 * const fromValues = ImmutableSet.of([1, 2, 3]);
 * const built = ImmutableSet.builder<string>()
 *   .add("a")
 *   .add("b")
 *   .build();
 * ```
 */
export class ImmutableSet<T> implements Iterable<T>, ReadonlySet<T> {
  readonly #data: ReadonlySet<T>;

  private constructor(data: ReadonlySet<T>) {
    this.#data = data;
  }

  /** Creates an empty {@linkcode ImmutableSet}. */
  static empty<T>(): ImmutableSet<T> {
    return new ImmutableSet(new Set());
  }

  /** Creates an {@linkcode ImmutableSet} from an iterable of values. */
  static of<T>(values: Iterable<T>): ImmutableSet<T> {
    return new ImmutableSet(new Set(values));
  }

  /** Returns a mutable {@linkcode ImmutableSetBuilder} for efficient construction. */
  static builder<T>(): ImmutableSetBuilder<T> {
    return new ImmutableSetBuilderImpl((source) => new ImmutableSet(source));
  }

  /** The number of values in the set. */
  get size(): number {
    return this.#data.size;
  }

  /** Returns `true` if the set contains `value`. */
  has(value: T): boolean {
    return this.#data.has(value);
  }

  /** Returns an iterator over `[value, value]` pairs (for `Map`-like interop). */
  entries(): SetIterator<[T, T]> {
    return this.#data.entries();
  }

  /** Returns an iterator over the values (same as {@linkcode values}). */
  keys(): SetIterator<T> {
    return this.#data.keys();
  }

  /** Returns an iterator over the values. */
  values(): SetIterator<T> {
    return this.#data.values();
  }

  /** Returns an iterator over the values. */
  [Symbol.iterator](): SetIterator<T> {
    return this.values();
  }

  /** Calls `callback` once for each value in the set. */
  forEach(
    callback: (value: T, value2: T, set: ReadonlySet<T>) => void,
    // deno-lint-ignore no-explicit-any, explicit-module-boundary-types
    thisArg?: any,
  ): void {
    this.#data.forEach((value) =>
      callback.call(thisArg, value, value, thisArg)
    );
  }

  /** Returns a new `Set` containing values present in both sets (ES2024). */
  intersection<U>(other: ReadonlySetLike<U>): Set<T & U> {
    return this.#data.intersection(other);
  }

  /** Returns a new `Set` of values in either set but not both (ES2024). */
  symmetricDifference<U>(other: ReadonlySetLike<U>): Set<T | U> {
    return this.#data.symmetricDifference(other);
  }

  /** Returns `true` if the sets share no common values (ES2024). */
  isDisjointFrom(other: ReadonlySetLike<T>): boolean {
    return this.#data.isDisjointFrom(other);
  }

  /** Returns `true` if every value in this set is also in `other` (ES2024). */
  isSubsetOf(other: ReadonlySetLike<T>): boolean {
    return this.#data.isSubsetOf(other);
  }

  /** Returns `true` if every value in `other` is also in this set (ES2024). */
  isSupersetOf(other: ReadonlySetLike<T>): boolean {
    return this.#data.isSupersetOf(other);
  }

  // -- Derived immutable operations (return new instances) --

  /** Returns a new set with `value` added. Returns `this` if already present. */
  add(value: T): ImmutableSet<T> {
    if (this.has(value)) return this;
    return this.toBuilder().add(value).build();
  }

  /** Returns a new set without `value`. Returns `this` if not present. */
  delete(value: T): ImmutableSet<T> {
    if (!this.has(value)) return this;
    return this.toBuilder().delete(value).build();
  }

  /** Returns a new `Set` containing values from both sets (ES2024). */
  union<U>(other: ReadonlySetLike<U>): Set<T | U> {
    return this.#data.union(other);
  }

  /** Returns a new {@linkcode ImmutableSet} containing only values present in both. */
  intersect(other: ImmutableSet<T>): ImmutableSet<T> {
    return this.filter((v) => other.has(v));
  }

  /** Returns a new `Set` of values in this set but not in `other` (ES2024). */
  difference<U>(other: ReadonlySetLike<U>): Set<T> {
    return this.#data.difference(other);
  }

  /** Returns a new set with values transformed by `fn`. */
  map<U>(fn: (value: T) => U): ImmutableSet<U> {
    const builder = ImmutableSet.builder<U>();
    for (const v of this.#data) {
      builder.add(fn(v));
    }
    return builder.build();
  }

  /** Returns a new set containing only values that satisfy `predicate`. */
  filter(predicate: (value: T) => boolean): ImmutableSet<T> {
    const builder = ImmutableSet.builder<T>();
    for (const v of this.#data) {
      if (predicate(v)) builder.add(v);
    }
    return builder.build();
  }

  /** Returns the values as a mutable array. */
  toArray(): T[] {
    return [...this.#data];
  }

  /** Converts this set into a mutable {@linkcode ImmutableSetBuilder}. */
  toBuilder(): ImmutableSetBuilder<T> {
    return new ImmutableSetBuilderImpl(
      (source) => new ImmutableSet(source),
      this.#data,
    );
  }

  /** Serializes the set to a JSON array. */
  toJSON(): T[] {
    return this.toArray();
  }

  /** Returns a human-readable string representation. */
  toString(): string {
    const items = [...this.#data].map(String).join(", ");
    return `ImmutableSet(${this.size}) { ${items} }`;
  }
}

/**
 * A mutable builder for efficiently constructing an {@linkcode ImmutableSet}.
 * Obtain one via {@linkcode ImmutableSet.builder} or
 * {@linkcode ImmutableSet.prototype.toBuilder}.
 * All mutation methods return `this` for chaining.
 */
export type ImmutableSetBuilder<T> = ImmutableSetBuilderImpl<T>;

class ImmutableSetBuilderImpl<T> {
  readonly #data: Set<T>;
  readonly #factory: (source: Set<T>) => ImmutableSet<T>;

  constructor(
    factory: (source: Set<T>) => ImmutableSet<T>,
    initial?: ReadonlySet<T>,
  ) {
    this.#factory = factory;
    this.#data = new Set(initial ?? []);
  }

  /** Adds `value` to the set. Returns `this`. */
  add(value: T): this {
    this.#data.add(value);
    return this;
  }

  /** Adds all values from the given iterable. Returns `this`. */
  addAll(values: Iterable<T>): this {
    for (const v of values) {
      this.#data.add(v);
    }
    return this;
  }

  /** Removes `value` from the set. Returns `this`. */
  delete(value: T): this {
    this.#data.delete(value);
    return this;
  }

  /** Returns `true` if the builder contains `value`. */
  has(value: T): boolean {
    return this.#data.has(value);
  }

  /** The current number of values. */
  get size(): number {
    return this.#data.size;
  }

  /** Builds and returns a new {@linkcode ImmutableSet} from the current values. */
  build(): ImmutableSet<T> {
    return this.#factory(this.#data);
  }
}
