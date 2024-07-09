import { Pipeable } from "./Pipeable.ts";

/**
 * Creates a pipeable function that applies a handler to each value in an async generator.
 *
 * @template T The type of values in the async generator.
 * @template R The type of values returned by the handler.
 * @template A The type of the optional argument passed to the handler.
 * @param {function(arg?: A): Handler<T, R>} handler The handler function to apply to each value.
 * @param {A} [arg] An optional argument to pass to the handler.
 * @returns {Pipeable<T, R>} A pipeable function that applies the handler to each value in the async generator.
 */
export function __fromHandler<T, R = T, A = undefined>(
  handler: (arg?: A) => Handler<T, R>,
  arg?: A,
): Pipeable<T, R> {
  return (it) => {
    return (async function* (
      it: AsyncGenerator<T>,
      handler: Handler<T, R>,
    ) {
      const flow = createFlow<T, R>(it);
      for await (let sourceValue of it) {
        do {
          try {
            const { done, value } = await handler(sourceValue, flow);
            if (done) {
              return;
            }
            yield value;
            break;
          } catch (error) {
            const result = await it.throw(error);
            if (result.done) {
              return;
            }
            sourceValue = result.value as Awaited<T>;
          }
        } while (true);
      }
      try {
        if (it.return) {
          await it.return(undefined);
        }
      } catch (error) {
        console.warn("Generator return threw an error", error);
      }
    })(it, handler(arg));
  };
}

/**
 * Creates a pipeable function that applies a handler function to each value in the input iterator.
 * The handler function can be asynchronous and can yield multiple values.
 *
 * @template T The type of values in the input iterator.
 * @template R The type of values yielded by the handler function.
 * @template A The type of the optional argument passed to the handler function.
 * @param {function(arg?: A): HandlerMulti<T, R>} handler The handler function to apply to each value.
 * @param {A} [arg] An optional argument to pass to the handler function.
 * @returns {Pipeable<T, R>} A pipeable function that applies the handler function to each value in the input iterator.
 */
export function __fromHandlerMulti<T, R = T, A = undefined>(
  handler: (arg?: A) => HandlerMulti<T, R>,
  arg?: A,
): Pipeable<T, R> {
  return async function* (it) {
    const h = handler(arg);
    const flow = createFlow<T, R>(it);
    for await (let sourceValue of it) {
      do {
        try {
          yield* h(sourceValue, flow);
          break;
        } catch (error) {
          const result = await it.throw(error);
          if (result.done) {
            return;
          }
          sourceValue = result.value as Awaited<T>;
        }
      } while (true);
    }
    try {
      if (it.return) {
        await it.return(undefined);
      }
    } catch (error) {
      console.warn("Generator return threw an error", error);
    }
  };
}

/**
 * Creates a `Pipeable` function from a pipeable factory function.
 *
 * @template T - The input type of the pipeable function.
 * @template R - The output type of the pipeable function.
 * @param pipeable - A function that returns a pipeable function.
 * @returns A `Pipeable` function that applies the pipeable function to the input value.
 */
export function __ofFunc<T, R = T>(
  pipeable: () => Func<T, R>,
): Pipeable<T, R> {
  return Pipeable.from(() => {
    const pipe = pipeable();
    return async (value, flow) => {
      return flow.asResult(await pipe(value));
    };
  });
}

const createFlow = (() => {
  const asResult = async <R>(value: R | Promise<R>) => {
    return { value: await value };
  };

  const breakFromLoop = (() => {
    // deno-lint-ignore no-explicit-any
    const promise = new Promise<IteratorResult<any>>(
      (res) => {
        res({ done: true, value: undefined });
      },
    );

    return () => promise;
  })();

  return <T, R = T>(it: AsyncGenerator<T>): Controller<T, R> => {
    return {
      continue: () => it.next(),
      break: breakFromLoop,
      asResult,
    };
  };
})();

type Controller<T, R> = {
  continue: () => Promise<IteratorResult<T>>;
  break: () => Promise<IteratorResult<R>>;
  asResult: (value: R | Promise<R>) => Promise<IteratorResult<R>>;
};

type Func<T, R> = (value: T) => R | Promise<R>;

type Handler<T, R> = (
  value: T,
  flow: Controller<T, R>,
) => IteratorResult<R> | Promise<IteratorResult<R>>;

type HandlerMulti<T, R> = (value: T, it: Controller<T, R>) => AsyncGenerator<R>;
