import { fromIterableLike, type IterableLike } from "../fromIterableLike.ts";
import { __fromHandler, __fromHandlerMulti, __ofFunc } from "./__utils.ts";

export type Pipeable<T = unknown, R = T> = (
  iterable: AsyncGenerator<T>,
) => AsyncGenerator<R>;

export const Pipeable = Object.freeze({
  toIterable,
  from: __fromHandler,
  fromMulti: __fromHandlerMulti,
  of: __ofFunc,
});

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
