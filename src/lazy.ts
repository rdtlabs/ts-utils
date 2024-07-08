import { once } from "./once.ts";
import type { Func } from "./types.ts";

/**
 * A method for lazily creating a function. This is helpful when you want to defer the
 * initialization of data/config/etc used by a function until it is actually needed.
 * @param fn Function to invoke once.
 * @param firstResultOnly If true, the function returned by fn will only return the first result and subsequent calls will return the same result.
 * @returns
 */
export function lazyFn<T extends Func>(
  fn: () => T,
  firstResultOnly = false,
): T {
  if (fn === undefined || fn === null || typeof fn !== "function") {
    throw new Error(`'fn' must be a valid function`);
  }

  const f = once(!firstResultOnly ? fn : () => once(fn()));
  return ((...args: unknown[]) => f()(...args)) as T;
}

/**
 * A method for creating  an object lazily by providing a function that returns the object.
 * The returned object is a Proxy that will invoke the function to create the object
 * on first access. Once invoked, the proxy will behave like the object itself.
 * @param fn Function that returns the object
 * @returns a Proxy object that will invoke the function on first access
 */
export function lazyObject<T extends object>(fn: () => T): T {
  if (fn === undefined || fn === null || typeof fn !== "function") {
    throw new Error(`'fn' must be a valid function`);
  }

  fn = once(fn);
  return new Proxy<T>({} as T, {
    apply(_, thisArg, args) {
      return Reflect.apply(fn, thisArg, args);
    },

    get: (_, p) => Reflect.get(fn(), p),

    getOwnPropertyDescriptor(_: T, p: string | symbol) {
      return Reflect.getOwnPropertyDescriptor(fn(), p);
    },

    set(_, p, value) {
      return Reflect.set(fn(), p, value);
    },

    defineProperty(_, p, attributes) {
      return Reflect.defineProperty(fn(), p, attributes);
    },

    deleteProperty(_, p) {
      return Reflect.deleteProperty(fn(), p);
    },

    getPrototypeOf() {
      return Reflect.getPrototypeOf(fn());
    },

    has(_, p) {
      return Reflect.has(fn(), p);
    },

    isExtensible() {
      return Reflect.isExtensible(fn());
    },

    ownKeys() {
      return Reflect.ownKeys(fn());
    },

    preventExtensions() {
      return Reflect.preventExtensions(fn());
    },

    setPrototypeOf(_, o) {
      return Reflect.setPrototypeOf(fn(), o);
    },
  }) as T;
}

export const Lazy = Object.seal({
  fn: lazyFn,
  of: lazyObject,
});
