import { type ErrorLike } from "../../types.ts";
import { Pipeable } from "./Pipeable.ts";

export function map<T = unknown, R = T>(
  mapper: (t: T, index: number) => Promise<R> | R,
): Pipeable<T, R> {
  return Pipeable.from<T, R>(() => {
    let index = 0;
    return (value, flow) => flow.asResult(mapper(value, index++));
  });
}

export function filter<T = unknown>(
  predicate: (t: T) => Promise<boolean> | boolean,
): Pipeable<T> {
  return Pipeable.from<T>(() => {
    return async (value, flow) => {
      while (!(await predicate(value as T))) {
        const result = await flow.continue();
        if (result.done) {
          return flow.break();
        }
        value = result.value;
      }

      return flow.asResult(value);
    };
  });
}

export function compose<T = unknown, R = T>(
  mapper: (t: T, index: number) => AsyncGenerator<R>,
): Pipeable<T, R> {
  return Pipeable.fromMulti<T, R>(() => {
    let index = 0;
    return (value) => {
      return mapper(value, index++);
    };
  });
}

export function peek<T = unknown>(
  fn: (t: T) => void | Promise<void>,
): Pipeable<T> {
  return Pipeable.of<T>(() => {
    return async (value) => {
      await fn(value);
      return value;
    };
  });
}

export function skipUntil<T>(
  predicate: (value: T) => boolean | Promise<boolean>,
): Pipeable<T> {
  return Pipeable.from<T>(() => {
    let skipping = true;
    return async (value, flow) => {
      while (!(!skipping || !(skipping = !(await predicate(value))))) {
        const result = await flow.continue();
        if (result.done) {
          return flow.break();
        }
        value = result.value;
      }

      return flow.asResult(value);
    };
  });
}

export function takeWhile<T>(
  predicate: (value: T) => boolean | Promise<boolean>,
): Pipeable<T> {
  return Pipeable.from<T>(() => {
    let done = false;
    return async (value, flow) => {
      if (done || (done = !(await predicate(value)))) {
        return flow.break();
      }

      return flow.asResult(value);
    };
  });
}

export function resumeOnError<T>(
  onError?: (error: ErrorLike) => Promise<boolean> | boolean,
): Pipeable<T> {
  return async function* (it) {
    for await (const item of it) {
      try {
        yield item;
      } catch (error) {
        if (onError && !(await onError(error))) {
          await it.throw(error);
        }
      }
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

export function buffer<T>(size: number): Pipeable<T[]> {
  if (size < 1 || size === Infinity) {
    throw new TypeError(`Invalid buffer size ${size}`);
  }

  return async function* (it) {
    let buffer: T[] = [];
    for await (let item of it) {
      do {
        try {
          buffer.push(item as T);
          if (buffer.length >= size) {
            const toYield = buffer;
            buffer = [];
            yield toYield;
          }
          break;
        } catch (error) {
          const result = await it.throw(error);
          if (result.done) {
            return;
          }
          item = result.value;
        }
      } while (true);
    }
    if (buffer.length > 0) {
      yield buffer;
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
