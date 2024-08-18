import { isThenable } from "../utils.ts";
import type { IterableLike } from "./IterableLike.ts";

/**
 * Converts an iterable-like object into an asynchronous generator.
 *
 * @template T - The type of elements in the iterable.
 * @param {IterableLike<T>} iterable - The iterable-like object to convert.
 * @returns {AsyncGenerator<T>} - An asynchronous generator that yields elements from the iterable.
 * @throws {Error} - If the input iterable is of an invalid type.
 */
export async function* fromIterableLike<T>(
  iterable: IterableLike<T>,
): AsyncGenerator<T> {
  if (Symbol.asyncIterator in iterable) {
    if ("throw" in iterable) {
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

/**
 * Converts an async iterable into an async generator.
 *
 * @param iterable - The async iterable to convert.
 * @returns An async generator that yields values from the async iterable.
 */
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
