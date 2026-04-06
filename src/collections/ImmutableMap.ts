// ---------------------------------------------------------------------------
// ImmutableMap
// ---------------------------------------------------------------------------

export class ImmutableMap<K, V> implements Iterable<[K, V]>, ReadonlyMap<K, V> {
  readonly #data: ReadonlyMap<K, V>;

  private constructor(data: ReadonlyMap<K, V>) {
    this.#data = data;
  }

  static empty<K, V>(): ImmutableMap<K, V> {
    return new ImmutableMap(new Map());
  }

  static of<K, V>(entries: Iterable<[K, V]>): ImmutableMap<K, V> {
    return new ImmutableMap(new Map(entries));
  }

  static builder<K, V>(initial?: Iterable<[K, V]>): ImmutableMapBuilder<K, V> {
    return new ImmutableMapBuilderImpl(
      (source) => new ImmutableMap(source),
      initial,
    );
  }

  get size(): number {
    return this.#data.size;
  }

  get(key: K): V | undefined {
    return this.#data.get(key);
  }

  getOrDefault(key: K, defaultValue: V): V {
    return this.#data.get(key) ?? defaultValue;
  }

  has(key: K): boolean {
    return this.#data.has(key);
  }

  keys(): MapIterator<K> {
    return this.#data.keys();
  }

  values(): MapIterator<V> {
    return this.#data.values();
  }

  entries(): MapIterator<[K, V]> {
    return this.#data.entries();
  }

  [Symbol.iterator](): MapIterator<[K, V]> {
    return this.entries();
  }

  forEach(
    callback: (value: V, key: K, map: ReadonlyMap<K, V>) => void,
    // deno-lint-ignore no-explicit-any, explicit-module-boundary-types
    thisArg?: any,
  ): void {
    this.#data.forEach((value, key) => callback(value, key, thisArg));
  }

  // -- Derived immutable operations (return new instances) --
  set(key: K, value: V): ImmutableMap<K, V> {
    return this.toBuilder().set(key, value).build();
  }

  delete(key: K): ImmutableMap<K, V> {
    if (!this.has(key)) return this;
    return this.toBuilder().delete(key).build();
  }

  merge(other: ImmutableMap<K, V>): ImmutableMap<K, V> {
    if (other.size === 0) return this;
    return this.toBuilder().setAll(other).build();
  }

  map<V2>(fn: (value: V, key: K) => V2): ImmutableMap<K, V2> {
    const builder = ImmutableMap.builder<K, V2>();
    for (const [k, v] of this.#data) {
      builder.set(k, fn(v, k));
    }
    return builder.build();
  }

  filter(predicate: (value: V, key: K) => boolean): ImmutableMap<K, V> {
    const builder = ImmutableMap.builder<K, V>();
    for (const [k, v] of this.#data) {
      if (predicate(v, k)) builder.set(k, v);
    }
    return builder.build();
  }

  toBuilder(): ImmutableMapBuilder<K, V> {
    return new ImmutableMapBuilderImpl(
      (source) => new ImmutableMap(source),
      this.#data,
    );
  }

  toJSON(): Record<string, V> {
    const obj: Record<string, V> = {} as Record<string, V>;
    for (const [k, v] of this.#data) {
      obj[String(k)] = v;
    }
    return obj;
  }

  toString(): string {
    const pairs = [...this.#data].map(([k, v]) => `${k} => ${v}`).join(", ");
    return `ImmutableMap(${this.size}) { ${pairs} }`;
  }
}

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

  set(key: K, value: V): this {
    this.#data.set(key, value);
    return this;
  }

  setAll(entries: Iterable<[K, V]>): this {
    for (const [k, v] of entries) {
      this.#data.set(k, v);
    }
    return this;
  }

  delete(key: K): this {
    this.#data.delete(key);
    return this;
  }

  has(key: K): boolean {
    return this.#data.has(key);
  }

  get size(): number {
    return this.#data.size;
  }

  build(): ImmutableMap<K, V> {
    return this.#factory(this.#data);
  }
}
