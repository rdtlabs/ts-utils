// deno-lint-ignore-file no-explicit-any

import { fromIterableLike } from "./async/fromIterableLike.ts";

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
   * Returns a new distinct list (similar to includes() on an array)
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
   * Creates a List from an array-like object.
   * @param arrayLike An array-like object to convert to an List.
   */
  static from<T>(arrayLike: ArrayLike<T>): List<T>;

  /**
   * Creates an array from an iterable object.
   * @param arrayLike An array-like object to convert to an array.
   * @param mapfn A mapping function to call on every element of the array.
   * @param thisArg Value of 'this' used to invoke the mapfn.
   */
  static from<T, U>(
    arrayLike: ArrayLike<T>,
    mapfn: (v: T, k: number) => U,
    // deno-lint-ignore explicit-module-boundary-types
    thisArg?: any,
  ): List<T>;

  static from<T>(...args: any[]): List<T> {
    if (args.length === 0) {
      throw new TypeError("List.from requires at least 1 argument");
    }

    const arrayLike = args[0];
    const list = new List<T>();
    if (args.length === 1) {
      for (const value of arrayLike) {
        list.push(value);
      }
    } else {
      const mapfn = args[1] ?? ((v: T) => v);
      const thisArg = args[2];
      for (let i = 0; i < arrayLike.length; i++) {
        list.push(mapfn.call(thisArg, arrayLike[i], i));
      }
    }

    return list;
  }

  static fromAsync<T>(
    iterableOrArrayLike:
      | AsyncIterable<T>
      | Iterable<T | Promise<T>>
      | ArrayLike<T | Promise<T>>,
  ): Promise<List<T>>;

  static fromAsync<T, U>(
    iterableOrArrayLike: AsyncIterable<T> | Iterable<T> | ArrayLike<T>,
    mapFn: (value: Awaited<T>) => U,
    // deno-lint-ignore explicit-module-boundary-types
    thisArg?: any,
  ): Promise<Awaited<List<T>>>;

  static async fromAsync<T>(...args: any[]): Promise<Awaited<List<T>>> {
    if (args.length === 0) {
      throw new TypeError("List.fromAsync requires at least 1 argument");
    }

    const iterableOrArrayLike = fromIterableLike<T>(args[0]);
    const list = new List<T>();
    if (args.length === 1) {
      for await (const value of iterableOrArrayLike) {
        list.push(value);
      }
    } else {
      const mapfn = args[1] ?? ((v: T) => v);
      const thisArg = args[2];
      for await (const value of iterableOrArrayLike) {
        list.push(await mapfn.call(thisArg, value));
      }
    }

    return list;
  }

  /**
   * This static method creates a new instance of the `ReadonlyList` interface.
   * The object is frozen and cannot be modified.
   * @param array items to be added to the ReadonlyList
   * @returns a new instance of the `ReadonlyList` interface
   */
  static readonly<T>(...array: readonly T[]): ReadonlyList<T> {
    Array.from;
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
   * Returns a new distinct list (similar to includes() on an array)
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
