// ---------------------------------------------------------------------------
// ImmutableMap
// ---------------------------------------------------------------------------

/**
 * A persistent, immutable map. All mutation operations return new instances,
 * leaving the original unchanged. Implements {@linkcode ReadonlyMap} and
 * {@linkcode Iterable} for interop with standard library code.
 *
 * Create instances via the static factory methods:
 *
 * @example
 * ```ts
 * const empty = ImmutableMap.empty<string, number>();
 * const fromEntries = ImmutableMap.of([["a", 1], ["b", 2]]);
 * const built = ImmutableMap.builder<string, number>()
 *   .set("x", 10)
 *   .set("y", 20)
 *   .build();
 * ```
 */
export class ImmutableMap<K, V> implements Iterable<[K, V]>, ReadonlyMap<K, V> {
  readonly #data: ReadonlyMap<K, V>;

  private constructor(data: ReadonlyMap<K, V>) {
    this.#data = data;
  }

  /** Creates an empty {@linkcode ImmutableMap}. */
  static empty<K, V>(): ImmutableMap<K, V> {
    return new ImmutableMap(new Map());
  }

  /** Creates an {@linkcode ImmutableMap} from an iterable of key-value pairs. */
  static of<K, V>(entries: Iterable<[K, V]>): ImmutableMap<K, V> {
    return new ImmutableMap(new Map(entries));
  }

  /**
   * Returns a mutable {@linkcode ImmutableMapBuilder} that can be used to
   * efficiently construct an {@linkcode ImmutableMap}. Optionally seeded
   * with initial entries.
   */
  static builder<K, V>(initial?: Iterable<[K, V]>): ImmutableMapBuilder<K, V> {
    return new ImmutableMapBuilderImpl(
      (source) => new ImmutableMap(source),
      initial,
    );
  }

  /** The number of entries in the map. */
  get size(): number {
    return this.#data.size;
  }

  /** Returns the value for `key`, or `undefined` if not present. */
  get(key: K): V | undefined {
    return this.#data.get(key);
  }

  /** Returns the value for `key`, or `defaultValue` if not present. */
  getOrDefault(key: K, defaultValue: V): V {
    return this.#data.get(key) ?? defaultValue;
  }

  /** Returns `true` if the map contains `key`. */
  has(key: K): boolean {
    return this.#data.has(key);
  }

  /** Returns an iterator over the keys. */
  keys(): MapIterator<K> {
    return this.#data.keys();
  }

  /** Returns an iterator over the values. */
  values(): MapIterator<V> {
    return this.#data.values();
  }

  /** Returns an iterator over `[key, value]` pairs. */
  entries(): MapIterator<[K, V]> {
    return this.#data.entries();
  }

  /** Returns an iterator over `[key, value]` pairs. */
  [Symbol.iterator](): MapIterator<[K, V]> {
    return this.entries();
  }

  /** Calls `callback` once for each entry in the map. */
  forEach(
    callback: (value: V, key: K, map: ReadonlyMap<K, V>) => void,
    // deno-lint-ignore no-explicit-any, explicit-module-boundary-types
    thisArg?: any,
  ): void {
    this.#data.forEach((value, key) => callback(value, key, thisArg));
  }

  // -- Derived immutable operations (return new instances) --

  /** Returns a new map with `key` set to `value`. */
  set(key: K, value: V): ImmutableMap<K, V> {
    return this.toBuilder().set(key, value).build();
  }

  /** Returns a new map without `key`. Returns `this` if `key` is absent. */
  delete(key: K): ImmutableMap<K, V> {
    if (!this.has(key)) return this;
    return this.toBuilder().delete(key).build();
  }

  /**
   * Returns a new map containing all entries from both `this` and `other`.
   * Entries in `other` overwrite entries in `this` with the same key.
   * Returns `this` if `other` is empty.
   */
  merge(other: ImmutableMap<K, V>): ImmutableMap<K, V> {
    if (other.size === 0) return this;
    return this.toBuilder().setAll(other).build();
  }

  /** Returns a new map with values transformed by `fn`. */
  map<V2>(fn: (value: V, key: K) => V2): ImmutableMap<K, V2> {
    const builder = ImmutableMap.builder<K, V2>();
    for (const [k, v] of this.#data) {
      builder.set(k, fn(v, k));
    }
    return builder.build();
  }

  /** Returns a new map containing only entries that satisfy `predicate`. */
  filter(predicate: (value: V, key: K) => boolean): ImmutableMap<K, V> {
    const builder = ImmutableMap.builder<K, V>();
    for (const [k, v] of this.#data) {
      if (predicate(v, k)) builder.set(k, v);
    }
    return builder.build();
  }

  /** Converts this map into a mutable {@linkcode ImmutableMapBuilder}. */
  toBuilder(): ImmutableMapBuilder<K, V> {
    return new ImmutableMapBuilderImpl(
      (source) => new ImmutableMap(source),
      this.#data,
    );
  }

  /** Serializes entries to a plain object with string keys. */
  toJSON(): Record<string, V> {
    const obj: Record<string, V> = {} as Record<string, V>;
    for (const [k, v] of this.#data) {
      obj[String(k)] = v;
    }
    return obj;
  }

  /** Returns a human-readable string representation. */
  toString(): string {
    const pairs = [...this.#data].map(([k, v]) => `${k} => ${v}`).join(", ");
    return `ImmutableMap(${this.size}) { ${pairs} }`;
  }
}

/**
 * A mutable builder for efficiently constructing an {@linkcode ImmutableMap}.
 * Obtain one via {@linkcode ImmutableMap.builder} or
 * {@linkcode ImmutableMap.prototype.toBuilder}.
 * All mutation methods return `this` for chaining.
 */
export type ImmutableMapBuilder<K, V> = ImmutableMapBuilderImpl<K, V>;

class ImmutableMapBuilderImpl<K, V> {
  readonly #data: Map<K, V>;
  readonly #factory: (source: Map<K, V>) => ImmutableMap<K, V>;

  constructor(
    factory: (source: Map<K, V>) => ImmutableMap<K, V>,
    initial?: Iterable<[K, V]>,
  ) {
    this.#factory = factory;
    this.#data = new Map(initial ?? []);
  }

  /** Adds or replaces the entry for `key`. Returns `this`. */
  set(key: K, value: V): this {
    this.#data.set(key, value);
    return this;
  }

  /** Adds all entries from the given iterable. Returns `this`. */
  setAll(entries: Iterable<[K, V]>): this {
    for (const [k, v] of entries) {
      this.#data.set(k, v);
    }
    return this;
  }

  /** Removes the entry for `key`. Returns `this`. */
  delete(key: K): this {
    this.#data.delete(key);
    return this;
  }

  /** Returns `true` if the builder contains `key`. */
  has(key: K): boolean {
    return this.#data.has(key);
  }

  /** The current number of entries. */
  get size(): number {
    return this.#data.size;
  }

  /** Builds and returns a new {@linkcode ImmutableMap} from the current entries. */
  build(): ImmutableMap<K, V> {
    return this.#factory(this.#data);
  }
}
