import { isThenable } from "../common/utils.ts";

export async function* fromIterableLike<T>(
  iterable: IterableLike<T>,
): AsyncIterable<T> {
  if (Symbol.asyncIterator in iterable) {
    yield* iterable;
  } else if (Symbol.iterator in iterable) {
    console.log("Symbol.iterator", iterable);
    for (const value of iterable) {
      yield await value;
    }
  } else if (Array.isArray(iterable)) {
    console.log("Array.isArray(iterable)", iterable);
    for (const value of iterable) {
      yield await value;
    }
  } else if (isThenable<IterableLike<T>>(iterable)) {
    console.log("isThenable<IterableLike<T>>(iterable)", iterable);
    yield* fromIterableLike(await iterable);
  } else {
    throw new Error("Invalid iterable input type");
  }
}

export type IterableLike<T> =
  | readonly T[]
  | readonly PromiseLike<T>[]
  | AsyncIterable<T>
  | Iterable<T>
  | Iterable<PromiseLike<T>>
  | PromiseLike<readonly T[]>
  | PromiseLike<readonly PromiseLike<T>[]>
  | PromiseLike<AsyncIterable<T>>
  | PromiseLike<Iterable<T>>
  | PromiseLike<Iterable<PromiseLike<T>>>;
