// deno-lint-ignore-file no-explicit-any

import { CancellationError } from "./cancellation/CancellationError.ts";

const once_symbol = Symbol("once");

export const Once = Object.freeze({
  of: <T extends (...args: any[]) => any>(fn: T): Once<T> => {
    if ((fn as any)[once_symbol]) {
      return asOnce(fn);
    }

    let called = 0;
    const wrapped = asOnce<T>((...args: any[]): any => {
      if (called !== 0) {
        return fn();
      }

      called = 1;
      try {
        const copy = fn;
        fn = recursiveErrorFn as T;
        const value = copy(...args);
        fn = (() => value) as T;
        return value;
      } catch (e) {
        fn = ((): any => {
          throw e;
        }) as T;

        throw e;
      }
    });

    Object.defineProperty(wrapped, "status", {
      get() {
        return called !== 0 ? called === 1 ? "invoked" : "cancelled" : "none";
      },
    });

    Object.defineProperty(wrapped, Symbol.dispose, {
      value: () => {
        if (called !== 0) {
          return;
        }
        called = -1;
        fn = cancelledFn as T;
      },
      writable: false,
    });

    Object.defineProperty(wrapped, once_symbol, {
      value: true,
      writable: false,
      enumerable: false,
    });

    return wrapped as Once<T>;
  },
}) as {
  of: <T extends (...args: any[]) => any>(fn: T) => Once<T>;
};

export const once = <T extends (...args: any[]) => any>(fn: T): Once<T> => {
  return Once.of(fn);
};

const asOnce = <T extends (...args: any[]) => any>(fn: unknown): Once<T> => {
  return fn as Once<T>;
};

export interface Once<T extends (...args: any[]) => any> extends Disposable {
  (...args: any[]): ReturnType<T>;
  status: "none" | "invoked" | "cancelled";
}

const cancelledFn = (): any => {
  throw new CancellationError();
};

const recursiveErrorFn = (): any => {
  throw new Error("Once.of() call chain is executing recursively.");
};
