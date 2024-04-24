import { isThenable } from "../utils.ts";

export async function* fromIterableLike<T>(
  iterable: IterableLike<T>,
): AsyncGenerator<T> {
  if (Symbol.asyncIterator in iterable) {
    if ('throw' in iterable) {
      yield* iterable as AsyncGenerator<T>;
    }
    yield* fromAsyncIterable(iterable);
  } else if (Symbol.iterator in iterable) {
    yield* iterate(iterable);
  } else if (Array.isArray(iterable)) {
    yield* iterate(iterable);
  } else if (isThenable<IterableLike<T>>(iterable)) {
    yield* fromIterableLike(await iterable);
  } else {
    throw new Error("Invalid iterable input type");
  }
}

export async function* fromAsyncIterable<T>(
  iterable: AsyncIterable<T>,
): AsyncGenerator<T> {
  for await (const value of iterable) {
    yield value;
  }
}

// deno-lint-ignore no-explicit-any
async function* iterate(it: Iterable<any>) {
  for (const value of it) {
    yield await value;
  }
}

export type IterableLike<T> =
  | readonly T[]
  | readonly PromiseLike<T>[]
  | AsyncGenerator<T>
  | AsyncIterable<T>
  | Iterable<T>
  | Iterable<PromiseLike<T>>
  | PromiseLike<readonly T[]>
  | PromiseLike<readonly PromiseLike<T>[]>
  | PromiseLike<AsyncIterable<T>>
  | PromiseLike<Iterable<T>>
  | PromiseLike<Iterable<PromiseLike<T>>>;
