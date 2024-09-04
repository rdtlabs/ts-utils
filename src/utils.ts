// Returns true if the value is a PromiseLike object.
export const isThenable = <T>(value: unknown): value is PromiseLike<T> => {
  // deno-lint-ignore no-explicit-any
  return typeof value === "object" && typeof (value as any).then === "function";
};
