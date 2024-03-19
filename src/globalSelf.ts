// deno-lint-ignore-file no-explicit-any
// deno-lint-ignore no-var
declare var globalThis: any;
// deno-lint-ignore no-var
declare var window: any;
// deno-lint-ignore no-var
declare var self: any;
declare const global: any;

type TimeoutId = ReturnType<typeof setTimeout>;

export type GlobalSelf = {
  location: Location;
  console: Console;
  crypto: Crypto;
  navigator: Pick<Navigator, "userAgent">;
  queueMicrotask: (callback: VoidFunction) => void;
  setTimeout: (handler: VoidFunction, timeout?: number) => TimeoutId;
  setInterval: (handler: VoidFunction, timeout?: number) => TimeoutId;
  clearTimeout: (timerId: TimeoutId) => void;
  clearInterval: (timerId: TimeoutId) => void;
};

export const globalSelf: GlobalSelf = (() => {
  function check(it: any) {
    // Math is known to exist as a global in every environment.
    return it && it.Math === Math && it;
  }

  const g = check(typeof window === "object" && window) ||
    check(typeof self === "object" && self) ||
    check(typeof global === "object" && global) ||
    check(typeof globalThis === "object" && globalThis) ||
    // This returns undefined when running in strict mode
    (function () {
      // @ts-ignore "this" is typed as "any" but it's
      // the only reliable way to get the global scope
      return this;
    })() ||
    Function("return this")();

  return g;
})();
