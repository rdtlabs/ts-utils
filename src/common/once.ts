// deno-lint-ignore-file no-explicit-any

const once_symbol = Symbol("once");

const Once = Object.freeze({
  of: <T extends (...args: any[]) => any>(fn: T): T => {
    if ((fn as any)[once_symbol]) {
      return fn;
    }

    let called = -1;
    const wrapped = (...args: any[]): any => {
      if (called === 1) {
        return fn();
      }

      if (called === 0) {
        throw new Error("Once.of() call chain is executing recursively.");
      }

      called = 0;
      try {
        const value = fn(...args);
        fn = (() => value) as T;
      } catch (e) {
        fn = ((): any => {
          throw e;
        }) as T;
      } finally {
        called = 1;
      }

      return fn(args);
    };

    (fn as any)[once_symbol] = true;

    return wrapped as T;
  },
});

export const once = Once.of;

export default Once;
