import { Pipeable } from "./Pipeable.ts";

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

export function __fromHandlerMulti<T, R = T, A = undefined>(
  handler: (arg?: A) => HandlerMulti<T, R>,
  arg?: A,
): Pipeable<T, R> {
  return (it) => {
    return (async function* (
      it: AsyncGenerator<T>,
      handler: HandlerMulti<T, R>,
    ) {
      const flow = createFlow<T, R>(it);
      for await (let sourceValue of it) {
        do {
          try {
            for await (const value of handler(sourceValue, flow)) {
              yield value;
            }
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

type HandlerMulti<T, R> = (value: T, it: Controller<T, R>) => AsyncIterable<R>;
