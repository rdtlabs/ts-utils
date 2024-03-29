/**
 * A List type that extends Array providing additional functionl
 * methods (e.g., `groupBy`)
 */
export interface List<T> extends Array<T> {
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

/**
 * A constructor for the `List` interface that include static
 * covenience methods for creating new instances of the `List` interface.
 */
interface ListConstructor {
  [Symbol.hasInstance](instance: unknown): boolean;

  /**
   * This constuctor creates a new instance of the `List` interface.
   * @param args items to be added to the list
   * @returns a new instance of the `List` interface
   */
  new <T>(
    ...args: T[]
  ): List<T>;

  /**
   * This static method creates a new instance of the `List` interface.
   * @param array items to be added to the list
   * @returns a new instance of the `List` interface
   */
  of<T>(...array: readonly T[]): List<T>;

  /**
   * This static method creates a new instance of the `ReadonlyList` interface.
   * The object is frozen and cannot be modified.
   * @param array items to be added to the ReadonlyList
   * @returns a new instance of the `ReadonlyList` interface
   */
  readonly<T>(...array: readonly T[]): ReadonlyList<T>;
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

const listSym: unique symbol = Symbol("List");

/**
 * The `ListConstructor` implementation.
 */
export const List = (() => {
  const ctor = function <T>(...args: T[]) {
    const list = [...args];
    return Object.defineProperties(list, {
      [listSym]: {
        writable: false,
        enumerable: false,
        value: true,
      },
      groupBy: {
        configurable: true,
        writable: false,
        value: (arg: unknown) => __groupBy(list, arg),
      },
    });
  } as unknown as ListConstructor;

  return Object.defineProperties(ctor, {
    [Symbol.hasInstance]: {
      writable: false,
      value: (instance: unknown) => {
        return instance !== null && typeof instance === "object" &&
          listSym in instance;
      },
    },
    of: {
      writable: false,
      value: <T>(...array: readonly T[]) => new List(...array),
    },
    readonly: {
      writable: false,
      value: <T>(...array: readonly T[]) =>
        Object.freeze(new List(...array)) as ReadonlyList<T>,
    },
  });
})();

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
>(mapper: U): Map<ReturnType<U>, List<T>>;

/**
 * Utility function that froups the elements of a provided array
 * based on a specified object's key.
 * @param key The key to group by
 */
export function groupBy<T, K extends keyof T>(
  list: readonly T[],
  key: K,
): Map<T[K], List<T>>;

/**
 * Not intended to be called directly. It is used to implement the
 * `groupBy` method on the `List` interface.
 */
export function groupBy<T>(...args: unknown[]): Map<unknown, List<T>> {
  // deno-lint-ignore no-explicit-any
  return __groupBy(args[0] as any, args[1]);
}

function __groupBy<T>(list: readonly T[], arg: unknown): Map<unknown, List<T>> {
  const fn = typeof arg === "function" ? arg : (v: T) => v[arg as keyof T];
  const map = new Map<unknown, List<T>>();
  for (const value of list) {
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
