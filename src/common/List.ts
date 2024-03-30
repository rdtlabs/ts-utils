// deno-lint-ignore-file no-explicit-any
/**
 * A List type that extends Array providing additional functionl
 * methods (e.g., `groupBy`)
 */
export interface List<T> extends Array<T> {
  /**
   * Groups the elements of a list based on a specified key selector function.
   * @param mapper A function that returns the key to group by
   */
  groupBy<U extends (value: T) => unknown, R = ReturnType<U>>(
    mapper: U,
  ): Map<R, List<T>>;

  /**
   * Groups the elements of a list based on a specified key.
   * @param key The key to group by
   */
  groupBy<K extends keyof T>(key: K): Map<T[K], List<T>>;

  /**
   * Returns a new list with all elements that pass the test implemented by the provided function.
   */
  distinct(): List<T>;
}

/**
 * A ReadonlyList type that extends ReadonlyArray providing additional
 * functionl methods (e.g., `groupBy`)
 */
export interface ReadonlyList<T> extends ReadonlyArray<T> {
  /**
   * Groups the elements of a list based on a specified key selector function.
   * @param mapper A function that returns the key to group by
   */
  groupBy<U extends (value: T) => unknown>(
    mapper: U,
  ): Map<ReturnType<U>, List<T>>;

  /**
   * Groups the elements of a list based on a specified key.
   * @param key The key to group by
   */
  groupBy<K extends keyof T>(key: K): Map<T[K], List<T>>;
}

export class List<T> extends Array<T> {
  constructor(...args: T[]) {
    super();
    Object.setPrototypeOf(this, new.target.prototype);
    this.push(...args);
  }

  /**
   * This static method creates a new instance of the `List` interface.
   * @param array items to be added to the list
   * @returns a new instance of the `List` interface
   */
  static of<T>(...array: readonly T[]): List<T> {
    return new List(...array) as List<T>;
  }

  /**
   * This static method creates a new instance of the `ReadonlyList` interface.
   * The object is frozen and cannot be modified.
   * @param array items to be added to the ReadonlyList
   * @returns a new instance of the `ReadonlyList` interface
   */
  static readonly<T>(...array: readonly T[]): ReadonlyList<T> {
    return Object.freeze(new List(...array)) as ReadonlyList<T>;
  }

  /**
   * Groups the elements of a list based on a specified key selector function.
   * @param mapper A function that returns the key to group by
   */
  groupBy<U extends (value: T) => unknown, R = ReturnType<U>>(
    mapper: U,
  ): Map<R, List<T>>;

  /**
   * Groups the elements of a list based on a specified key.
   * @param key The key to group by
   */
  groupBy<K extends keyof T>(key: K): Map<T[K], List<T>>;

  /**
   * Not intended to be called directly. It is used to implement the
   * `groupBy` method on the `List` interface.
   */
  groupBy(...args: unknown[]): Map<unknown, List<T>> {
    const arg = args[0];
    const fn = typeof arg === "function" ? arg : (v: T) => v[arg as keyof T];
    const map = new Map<unknown, List<T>>();
    for (const value of this) {
      const key = fn(value);
      const group = map.get(key);
      if (!group) {
        map.set(key, new List<T>(value));
      } else {
        group.push(value);
      }
    }
    return map;
  }

  /**
   * Returns a new list with all elements that pass the test implemented by the provided function.
   */
  distinct(): List<T> {
    return this.reduce((uniqueList, item) => {
      if (!uniqueList.includes(item)) {
        uniqueList.push(item);
      }

      return uniqueList;
    }, new List<T>());
  }

  override filter<S extends T>(
    predicate: (value: T, index: number, array: T[]) => value is S,
    thisArg?: unknown,
  ): List<S>;
  override filter(
    predicate: (value: T, index: number, array: T[]) => unknown,
    thisArg?: unknown,
  ): List<T>;
  override filter(predicate: unknown, thisArg?: unknown): unknown {
    return super.filter(predicate as any, thisArg);
  }

  override map<U>(
    callbackfn: (value: T, index: number, array: T[]) => U,
    thisArg?: unknown,
  ): List<U> {
    return super.map(callbackfn, thisArg) as any;
  }

  override slice(start?: number, end?: number): List<T> {
    return super.slice(start, end) as any;
  }

  override sort(compareFn?: (a: T, b: T) => number): this {
    return super.sort(compareFn) as any;
  }

  override concat(...items: ConcatArray<T>[]): List<T>;
  override concat(...items: (T | ConcatArray<T>)[]): List<T>;
  override concat(...items: unknown[]): unknown {
    return new List(...super.concat(...(items as any)));
  }

  override reverse(): List<T> {
    return super.reverse() as any;
  }

  override splice(start: number, deleteCount?: number): List<T>;
  override splice(start: number, deleteCount: number, ...items: T[]): List<T>;
  override splice(
    start: number,
    deleteCount: number,
    ...items: unknown[]
  ): unknown {
    return new List(...super.splice(start, deleteCount, ...(items as any)));
  }

  override flatMap<U, This = undefined>(
    callback: (value: T, index: number, array: T[]) => U | ReadonlyArray<U>,
    thisArg?: This,
  ): List<U> {
    return super.flatMap(callback, thisArg) as any;
  }
}

/**
 * Utility function that froups the elements of a provided array based on
 * a specified key selector function.
 * @param mapper A function that returns the key to group by
 */
export function groupBy<
  T,
  U extends (
    list: readonly T[],
    value: T,
  ) => unknown,
>(mapper: U): Map<ReturnType<U>, T[]>;

/**
 * Utility function that froups the elements of a provided array
 * based on a specified object's key.
 * @param key The key to group by
 */
export function groupBy<T, K extends keyof T>(
  list: readonly T[],
  key: K,
): Map<T[K], T[]>;

/**
 * Not intended to be called directly. It is used to implement the
 * `groupBy` method on the `List` interface.
 */
export function groupBy<T>(...args: unknown[]): Map<unknown, T[]> {
  return __groupBy(args[0] as any, args[1]);
}

function __groupBy<T>(list: readonly T[], arg: unknown): Map<unknown, T[]> {
  const fn = typeof arg === "function" ? arg : (v: T) => v[arg as keyof T];
  const map = new Map<unknown, T[]>();
  for (const value of list) {
    const key = fn(value);
    const group = map.get(key);
    if (!group) {
      map.set(key, [value]);
    } else {
      group.push(value);
    }
  }
  return map;
}
