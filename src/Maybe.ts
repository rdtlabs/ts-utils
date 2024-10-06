import { objects } from "./objects.ts";
import type { ErrorLike } from "./types.ts";

/**
 * Maybe type that can be used to represent optional values.
 */
export type Maybe<T> = {
  /**
   * Returns the value if it is not null or undefined, otherwise throws an
   * error
   */
  elseThrow: (errFn: () => ErrorLike) => T;
  /**
   * Returns the value if it is not null or undefined, otherwise returns the
   * alternative
   */
  else: (alt: T) => T;
  /**
   * Returns the value if it is not null or undefined, otherwise returns the
   * alternative from the provided function
   */
  elseGet: (altFn: () => T) => T;
  /**
   * Returns the value if it is not null or undefined, otherwise returns an
   * alternative maybe from the provided function
   */
  or(orFn: () => Maybe<T>): Maybe<T>;
  /**
   * Returns the value if the provided predicate function within a Maybe, else
   * a maybe with a nil value will be returned
   */
  filter: (predicate: (t: T) => boolean) => Maybe<T>;
  /**
   * Maps the value to a new value using the provided mapper function
   */
  map: <R>(mapper: (t: T) => R) => Maybe<R>;
  /**
   * Maps the Maybe to a new Maybe using the provided mapper function
   */
  flatMap: <R>(mapper: (t: T) => Maybe<R>) => Maybe<R>;
  /**
   * Returns the value if it is not null or undefined, otherwise returns an
   * object with the value and a boolean indicating if the value is present
   */
  get: () => MaybeResult<T>;
  /**
   * Returns an iterator that will yield the value if it is not null or
   * undefined
   */
  [Symbol.iterator](): Iterator<T>;
  /**
   * The value of the maybe
   */
  readonly value: T | undefined;
  /**
   * Indicates if the value is null or undefined
   */
  readonly isNil: boolean;
};

type __MaybeStatic = {
  of: <T>(value?: T) => Maybe<T>;
  ofAsync: <T>(value?: T | Promise<T>) => Promise<Maybe<T>>;
};

/**
 * Utility object for creating Maybe instances.
 */
export const Maybe: __MaybeStatic = Object.freeze({
  /**
   * Creates a Maybe instance from the provided value.
   */
  of<T>(value?: T): Maybe<T> {
    return maybe(value);
  },
  /**
   * Creates a Promise<Maybe> instance from the provided value or promise.
   */
  ofAsync<T>(value?: T | Promise<T>): Promise<Maybe<T>> {
    if (value instanceof Promise) {
      return value.then(maybe);
    }
    return Promise.resolve(maybe(value));
  },
});

function maybe<T>(value?: T): Maybe<T> {
  if (value === null) {
    return nullMaybe as unknown as Maybe<T>;
  }

  if (value === undefined) {
    return undefMaybe as unknown as Maybe<T>;
  }

  const self: Maybe<T> = {
    get value() {
      return value;
    },
    get isNil() {
      return false;
    },
    elseThrow() {
      return value;
    },
    else() {
      return value;
    },
    elseGet() {
      return value;
    },
    map<R>(mapper: (t: T) => R) {
      return maybe(mapper(value));
    },
    flatMap<R>(mapper: (t: T) => Maybe<R>) {
      return mapper(value);
    },
    filter(predicate: (t: T) => boolean) {
      if (objects.isNil(value) || predicate(value)) {
        return self;
      }
      return maybe();
    },
    or() {
      return self;
    },
    get: () => {
      return {
        value,
        ok: true,
      };
    },
    [Symbol.iterator](): Iterator<T> {
      let done = false;
      return {
        next() {
          if (done) {
            return { done: true, value: undefined };
          }

          done = true;
          return { value };
        },
      };
    },
  };

  return Object.freeze(self);
}

type MaybeResult<T> = TrueResult<T> | FalseResult;

type TrueResult<T> = {
  value: T;
  ok: true;
};

type FalseResult = {
  value?: undefined;
  ok: false;
};

const { nullMaybe, undefMaybe } = (() => {
  function create(value: undefined | null) {
    const self: Maybe<undefined | null> = {
      value,
      isNil: true,
      elseThrow(errFn: () => ErrorLike) {
        throw errFn();
      },
      // deno-lint-ignore no-explicit-any
      else(alt: any) {
        return alt;
      },
      // deno-lint-ignore no-explicit-any
      elseGet(altFn: () => any) {
        return altFn();
      },
      map<R>() {
        return self as unknown as Maybe<R>;
      },
      flatMap<R>() {
        return self as unknown as Maybe<R>;
      },
      filter() {
        return self;
      },
      // deno-lint-ignore no-explicit-any
      or(orFn: () => Maybe<any>) {
        return orFn();
      },
      get: () => {
        return {
          ok: false,
        };
      },
      // deno-lint-ignore no-explicit-any
      [Symbol.iterator](): Iterator<any> {
        return {
          next() {
            return { done: true, value: undefined };
          },
        };
      },
    };

    return Object.freeze(self);
  }
  return {
    nullMaybe: create(null) as Maybe<null>,
    undefMaybe: create(undefined) as Maybe<undefined>,
  };
})();
