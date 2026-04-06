// ============================================================================
// Immutable Collections with Builder Pattern
// ============================================================================

// ---------------------------------------------------------------------------
// ImmutableSet
// ---------------------------------------------------------------------------
export class ImmutableSet<T> implements Iterable<T>, ReadonlySet<T> {
  readonly #data: ReadonlySet<T>;

  private constructor(data: ReadonlySet<T>) {
    this.#data = data;
  }

  static empty<T>(): ImmutableSet<T> {
    return new ImmutableSet(new Set());
  }

  static of<T>(values: Iterable<T>): ImmutableSet<T> {
    return new ImmutableSet(new Set(values));
  }

  static builder<T>(): ImmutableSetBuilder<T> {
    return new ImmutableSetBuilderImpl((source) => new ImmutableSet(source));
  }

  get size(): number {
    return this.#data.size;
  }

  has(value: T): boolean {
    return this.#data.has(value);
  }

  entries(): SetIterator<[T, T]> {
    return this.#data.entries();
  }

  keys(): SetIterator<T> {
    return this.#data.keys();
  }

  values(): SetIterator<T> {
    return this.#data.values();
  }

  [Symbol.iterator](): SetIterator<T> {
    return this.values();
  }

  forEach(
    callback: (value: T, value2: T, set: ReadonlySet<T>) => void,
    // deno-lint-ignore no-explicit-any, explicit-module-boundary-types
    thisArg?: any,
  ): void {
    this.#data.forEach((value) =>
      callback.call(thisArg, value, value, thisArg)
    );
  }

  intersection<U>(other: ReadonlySetLike<U>): Set<T & U> {
    return this.#data.intersection(other);
  }

  symmetricDifference<U>(other: ReadonlySetLike<U>): Set<T | U> {
    return this.#data.symmetricDifference(other);
  }

  isDisjointFrom(other: ReadonlySetLike<T>): boolean {
    return this.#data.isDisjointFrom(other);
  }

  isSubsetOf(other: ReadonlySetLike<T>): boolean {
    return this.#data.isSubsetOf(other);
  }

  isSupersetOf(other: ReadonlySetLike<T>): boolean {
    return this.#data.isSupersetOf(other);
  }

  // -- Derived immutable operations (return new instances) --

  add(value: T): ImmutableSet<T> {
    if (this.has(value)) return this;
    return this.toBuilder().add(value).build();
  }

  delete(value: T): ImmutableSet<T> {
    if (!this.has(value)) return this;
    return this.toBuilder().delete(value).build();
  }

  union<U>(other: ReadonlySetLike<U>): Set<T | U> {
    return this.#data.union(other);
  }

  intersect(other: ImmutableSet<T>): ImmutableSet<T> {
    return this.filter((v) => other.has(v));
  }

  difference<U>(other: ReadonlySetLike<U>): Set<T> {
    return this.#data.difference(other);
  }

  map<U>(fn: (value: T) => U): ImmutableSet<U> {
    const builder = ImmutableSet.builder<U>();
    for (const v of this.#data) {
      builder.add(fn(v));
    }
    return builder.build();
  }

  filter(predicate: (value: T) => boolean): ImmutableSet<T> {
    const builder = ImmutableSet.builder<T>();
    for (const v of this.#data) {
      if (predicate(v)) builder.add(v);
    }
    return builder.build();
  }

  toArray(): T[] {
    return [...this.#data];
  }

  toBuilder(): ImmutableSetBuilder<T> {
    return new ImmutableSetBuilderImpl(
      (source) => new ImmutableSet(source),
      this.#data,
    );
  }

  toJSON(): T[] {
    return this.toArray();
  }

  toString(): string {
    const items = [...this.#data].map(String).join(", ");
    return `ImmutableSet(${this.size}) { ${items} }`;
  }
}

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

  add(value: T): this {
    this.#data.add(value);
    return this;
  }

  addAll(values: Iterable<T>): this {
    for (const v of values) {
      this.#data.add(v);
    }
    return this;
  }

  delete(value: T): this {
    this.#data.delete(value);
    return this;
  }

  has(value: T): boolean {
    return this.#data.has(value);
  }

  get size(): number {
    return this.#data.size;
  }

  build(): ImmutableSet<T> {
    return this.#factory(this.#data);
  }
}
