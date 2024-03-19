// deno-lint-ignore no-explicit-any
export const isThenable = <T>(value: any): value is PromiseLike<T> => {
  return typeof value === "object" && typeof value.then === "function";
};
