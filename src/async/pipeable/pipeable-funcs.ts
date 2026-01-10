import { Pipeable } from "./Pipeable.ts";

/**
 * @fileoverview This file contains pipeable functions for asynchronous operations.
 * @module async/pipeable/pipeable-funcs
 */

/**
 * Creates a new pipeable function that applies a mapper function to each value in the pipeline.
 * @template T The type of the input values.
 * @template R The type of the output values.
 * @param {(t: T, index: number) => Promise<R> | R} mapper The mapper function to apply to each value.
 * @returns {Pipeable<T, R>} The pipeable function.
 */
export function map<T = unknown, R = T>(
  mapper: (t: T, index: number) => Promise<R> | R,
): Pipeable<T, R> {
  return Pipeable.from<T, R>(() => {
    let index = 0;
    return (value, flow) => flow.asResult(mapper(value, index++));
  });
}

/**
 * Creates a new pipeable function that filters values in the pipeline based on a predicate function.
 * @template T The type of the input values.
 * @param {(t: T) => Promise<boolean> | boolean} predicate The predicate function to filter values.
 * @returns {Pipeable<T>} The pipeable function.
 */
export function filter<T = unknown>(
  predicate: (t: T) => Promise<boolean> | boolean,
): Pipeable<T> {
  return Pipeable.from<T>(() => {
    return async (value, flow) => {
      while (!(await predicate(value))) {
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

/**
 * Creates a new pipeable function that composes multiple async generators into a single pipeline.
 * @template T The type of the input values.
 * @template R The type of the output values.
 * @param {(t: T, index: number) => AsyncGenerator<R>} mapper The async generator function to compose.
 * @returns {Pipeable<T, R>} The pipeable function.
 */
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

/**
 * Creates a new pipeable function that allows peeking at each value in the pipeline without modifying it.
 * @template T The type of the input values.
 * @param {(t: T) => void | Promise<void>} fn The function to call for each value.
 * @returns {Pipeable<T>} The pipeable function.
 */
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

/**
 * Creates a new pipeable function that skips values in the pipeline until a predicate is satisfied.
 * @template T The type of the input values.
 * @param {(value: T) => boolean | Promise<boolean>} predicate The predicate function to skip values.
 * @returns {Pipeable<T>} The pipeable function.
 */
export function skipUntil<T>(
  predicate: (value: T) => boolean | Promise<boolean>,
): Pipeable<T> {
  return Pipeable.from<T>(() => {
    let skipping = true;
    return async (value, flow) => {
      if (skipping) {
        while (!(await predicate(value))) {
          const result = await flow.continue();
          if (result.done) {
            return flow.break();
          }
          value = result.value;
        }
        skipping = false;
      }

      return flow.asResult(value);
    };
  });
}

/**
 * Creates a new pipeable function that takes values in the pipeline until a predicate is not satisfied.
 * @template T The type of the input values.
 * @param {(value: T) => boolean | Promise<boolean>} predicate The predicate function to take values.
 * @returns {Pipeable<T>} The pipeable function.
 */
export function takeWhile<T>(
  predicate: (value: T) => boolean | Promise<boolean>,
): Pipeable<T> {
  return Pipeable.from<T>(() => {
    let done = false;
    return async (value, flow) => {
      if (done) {
        return flow.break();
      }

      if (await predicate(value)) {
        return flow.asResult(value);
      }

      done = true;

      return flow.break();
    };
  });
}

/**
 * Creates a new pipeable function that resumes the pipeline after encountering an error, optionally handling the error.
 * @template T The type of the input values.
 * @param {(error: unknown) => Promise<boolean> | boolean} [onError] The error handler function.
 *        Return `true` to resume iteration, `false` to re-throw the error.
 *        If not provided, all errors are swallowed and iteration continues.
 * @returns {Pipeable<T>} The pipeable function.
 */
export function resumeOnError<T>(
  onError?: (error: unknown) => Promise<boolean> | boolean,
): Pipeable<T> {
  return async function* (it) {
    for await (const item of it) {
      try {
        yield item;
      } catch (error) {
        if (onError && !(await onError(error))) {
          await it.throw?.(error);
          throw error;
        }
      }
    }
  };
}

/**
 * Creates a new pipeable function that chunks values in the pipeline into arrays of a specified size.
 * @template T The type of the input values.
 * @param {number} size The size of each chunk.
 * @returns {Pipeable<T[]>} The pipeable function.
 * @throws {TypeError} If the size is invalid.
 */
export function chunk<T>(size: number): Pipeable<T, T[]> {
  if (size < 1 || size === Infinity || Number.isNaN(size)) {
    throw new TypeError(`Invalid buffer size ${size}`);
  }

  if (!Number.isInteger(size)) {
    throw new TypeError(`Buffer size must be an integer, got ${size}`);
  }

  return async function* (it) {
    let buffer: T[] = [];
    for await (const item of it) {
      buffer.push(item);
      if (buffer.length >= size) {
        const toYield = buffer;
        buffer = [];
        yield toYield;
      }
    }
    if (buffer.length > 0) {
      yield buffer;
    }
  };
}
