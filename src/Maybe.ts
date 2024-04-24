import { ErrorLike } from "./types.ts";

export type Maybe<T> = {
  elseThrow: (errFn: () => ErrorLike) => T;
  else: (alt: T) => T;
  elseGet: (altFn: () => T) => T;
  map: <R>(mapper: (t: T) => R) => Maybe<R>;
  get: () => MaybeResult<T>
};

export const Maybe = Object.freeze({
  of<T>(value?: T): Maybe<T> {
    return maybe(value);
  },
  ofAsync<T>(value?: T | Promise<T>): Promise<Maybe<T>> {
    if (value instanceof Promise) {
      return value.then(maybe);
    }
    return Promise.resolve(maybe(value));
  }
});

function maybe<T>(value?: T): Maybe<T> {
  return {
    elseThrow(errFn: () => ErrorLike) {
      if (value === undefined) {
        throw errFn();
      }

      return value;
    },
    else(alt: T) {
      return value ?? alt;
    },
    elseGet(altFn: () => T) {
      return value ?? altFn();
    },
    map<R>(mapper: (t: T) => R) {
      return maybe(value ? mapper(value) : undefined);
    },
    get: () => {
      if (value === undefined) {
        return {
          ok: false
        }
      }

      return {
        value,
        ok: true
      }
    }
  };
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