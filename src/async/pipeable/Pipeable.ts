import type { IterableLike } from "../IterableLike.ts";
import { fromIterableLike } from "../fromIterableLike.ts";
import { __fromHandler, __fromHandlerMulti, __ofFunc } from "./__utils.ts";

/**
 * Represents a pipeable function that transforms an async generator of type `T` into an async generator of type `R`.
 *
 * @template T The type of values in the input async generator.
 * @template R The type of values in the output async generator.
 */
export type Pipeable<T = unknown, R = T> = (
  iterable: AsyncGenerator<T>,
) => AsyncGenerator<R>;

/**
 * The `Pipeable` object provides utility functions for working with pipes.
 */
export const Pipeable = Object.freeze({
  toIterable,
  from: __fromHandler,
  fromMulti: __fromHandlerMulti,
  of: __ofFunc,
});

/**
 * Converts an input iterable into an async generator by applying a series of pipeable functions.
 *
 * @template T The type of elements in the input iterable.
 * @template R The type of elements in the resulting async generator.
 * @param {IterableLike<T>} input The input iterable to convert.
 * @param {...Pipeable<any, any>} pipes The pipeable functions to apply to the input iterable.
 * @returns {AsyncGenerator<R>} An async generator that yields the transformed elements.
 */
async function* toIterable<T, R = T>(
  input: IterableLike<T>,
  // deno-lint-ignore no-explicit-any
  ...pipes: Pipeable<any, any>[]
): AsyncGenerator<R> {
  if (pipes.length === 0) {
    return yield* fromIterableLike<R>(input as IterableLike<R>);
  }

  let currentGenerator = pipes[0](fromIterableLike(input));

  for (let i = 1; i < pipes.length; i++) {
    currentGenerator = pipes[i](currentGenerator);
  }

  return yield* currentGenerator;
}
