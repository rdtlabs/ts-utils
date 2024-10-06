import { CancellationError } from "./cancellation/CancellationError.ts";
import type { Func } from "./types.ts";

const once_symbol = Symbol("once");

/**
 * Wraps a function to ensure it can only be invoked once and returns the same value (or error) on subsequent calls.
 * @param fn Function to wrap
 * @returns a function whose return value (or error) will remain the same after first call. The function
 * can be disposed prior to the first call, it will throw a CancellationError if subsequently invoked.
 */
export const once = <T extends Func>(fn: T): Once<T> => {
  if (!fn || typeof fn !== "function") {
    throw new Error(`'fn' must be a valid function`);
  }

  if (once_symbol in fn) {
    return fn as unknown as Once<T>;
  }

  let called = 0;
  const wrapped = ((...args: unknown[]) => {
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
      fn = ((): unknown => {
        throw e;
      }) as T;

      throw e;
    }
  }) as Once<T>;

  Object.defineProperty(wrapped, "status", {
    get() {
      if (called === 0) {
        return "none";
      }

      return called === 1 ? "invoked" : "cancelled";
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

  return wrapped;
};

export const Once: {
  of: <T extends Func>(fn: T) => Once<T>;
  is: (fn: unknown) => fn is Once<Func>;
} = Object.seal({
  of: once,
  // deno-lint-ignore no-explicit-any
  is: (fn: any): fn is Once<Func> => {
    return fn && typeof fn === "function" && once_symbol in fn;
  },
});

export type Once<T extends Func> = T & Disposable & {
  status: "none" | "invoked" | "cancelled";
};

const cancelledFn: Func = (): never => {
  throw new CancellationError();
};

const recursiveErrorFn: Func = (): never => {
  throw new Error("Once.of() call chain is executing recursively.");
};
