import { objects } from "./objects.ts";
import type { ErrorLike } from "./types.ts";

export type Maybe<T> = {
  elseThrow: (errFn: () => ErrorLike) => T;
  else: (alt: T) => T;
  elseGet: (altFn: () => T) => T;
  or(orFn: () => Maybe<T>): Maybe<T>;
  filter: (predicate: (t: T) => boolean) => Maybe<T>;
  map: <R>(mapper: (t: T) => R) => Maybe<R>;
  flatMap: <R>(mapper: (t: T) => Maybe<R>) => Maybe<R>;
  get: () => MaybeResult<T>;
  [Symbol.iterator](): Iterator<T>;
  readonly value: T | undefined;
  readonly isNil: boolean;
};

type __MaybeStatic = {
  of: <T>(value?: T) => Maybe<T>;
  ofAsync: <T>(value?: T | Promise<T>) => Promise<Maybe<T>>;
};

export const Maybe: __MaybeStatic = Object.freeze({
  of<T>(value?: T): Maybe<T> {
    return maybe(value);
  },
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

  let self: Maybe<T>;
  return Object.freeze(
    self = {
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
    },
  );
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
    let self: Maybe<undefined | null>;
    return Object.freeze(
      self = {
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
      },
    );
  }
  return {
    nullMaybe: create(null) as Maybe<null>,
    undefMaybe: create(undefined) as Maybe<undefined>,
  };
})();
