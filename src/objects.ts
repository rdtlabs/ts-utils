import { InvalidArgumentError } from "./errors/error.types.ts";
import type { Func, Supplier } from "./types.ts";

// deno-lint-ignore no-explicit-any
type Propped<K extends keyof any, TYPE = any> = {
  [P in K]: TYPE;
};

/**
 * Utility functions for working with objects.
 */
export const objects = Object.freeze({
  coalesce: (nillable, alt) => {
    return objects.isNil(nillable) ? alt : nillable;
  },
  isNil: (value) => {
    return value === null || objects.isUndef(value);
  },
  isNotNil: (value) => {
    return !objects.isNil(value);
  },
  isStr: (value) => {
    return typeof value === "string";
  },
  isNum: (value) => {
    return typeof value === "number";
  },
  isNotNum: (value) => {
    return typeof value !== "number" || Number.isNaN(value);
  },
  isSymbol: (value) => {
    return typeof value === "symbol";
  },
  isUndef: (value) => {
    return value === undefined;
  },
  isFunc: (value) => {
    return !objects.isNil(value) && typeof value === "function";
  },
  isObject: (value) => {
    if (objects.isNil(value)) {
      return false;
    }

    const type = typeof value;
    return type === "object" || type === "function";
  },
  isDate: (value) => {
    return objects.isObject(value) && value instanceof Date;
  },
  isBool: (value) => {
    return typeof value === "boolean";
  },
  isNotBool: (value) => {
    return typeof value !== "boolean";
  },
  isFalse: (value) => {
    return value !== true;
  },
  isTrue: (value) => {
    return value === true;
  },
  isThenable: (value) => {
    return typeof value === "object" &&
      typeof (value as { then: unknown }).then === "function";
  },
  has: (value, prop) => {
    // deno-lint-ignore no-explicit-any
    return !!value && (value as any)[prop] !== undefined;
  },
  hasFunc: (value, prop) => {
    // deno-lint-ignore no-explicit-any
    return !!value && typeof (value as any)[prop] === "function";
  },
  isPromise: (value) => {
    return value instanceof Promise;
  },
  require: (value, argName) => {
    if (objects.isNotNil(value)) {
      return value;
    }

    throw new Error(`Argument '${argName}' cannot be undefined/null`);
  },
  requireElse: (value, defaultValue) => {
    if (objects.isNotNil(value)) {
      return value;
    }

    return defaultValue;
  },
  requireElseGet: (value, defaultFn) => {
    if (objects.isNotNil(value)) {
      return value;
    }

    return objects.requireNonNil(defaultFn)();
  },
  requireNonNil: (value, message) => {
    if (objects.isNotNil(value)) {
      return value;
    }

    if (typeof message === "function") {
      throw message();
    }

    throw new Error(message ?? "value is required");
  },
  requireNumOrElse: (value, defaultValue, radix) => {
    if (objects.isNil(value)) {
      return defaultValue;
    }

    const parseResult = typeof value === "number"
      ? value
      : Number.parseInt(value, radix ?? 10);

    if (Number.isNaN(parseResult)) {
      throw new InvalidArgumentError(
        `value '${value}' could not be parsed as a number`,
      );
    }

    return parseResult;
  },
}) as {
  /**
   * Returns the first non-null/undefined value.
   */
  coalesce: <T>(nillable: T | undefined | null, alt: T) => T;

  /**
   * Returns true if the value is null or undefined.
   */
  isNil: (value: unknown) => value is null | undefined;

  /**
   * Returns true if the value is NOT null or undefined.
   */
  isNotNil: <T>(value: T | null | undefined) => value is T;

  /**
   * Returns true if the value is a string.
   */
  isStr: (value: unknown) => value is string;

  /**
   * Returns true if the value is a number.
   */
  isNum: (value: unknown) => value is number;

  /**
   * Returns true if the value is NOT a number.
   */
  isNotNum: (value: unknown) => boolean;

  /**
   * Returns true if the value is a symbol.
   */
  isSymbol: (value: unknown) => value is symbol;

  /**
   * Returns true if the value is undefined.
   */
  isUndef: (value: unknown) => value is undefined;

  /**
   * Returns true if the value is a function.
   */
  isFunc: (value: unknown) => value is Func;

  /**
   * Returns true if the value is an object.
   */
  isObject: (value: unknown) => value is object;

  /**
   * Returns true if the value is a Date.
   */
  isDate: (value: unknown) => value is Date;

  /**
   * Returns true if the value is a boolean.
   */
  isBool: (value: unknown) => value is boolean;

  /**
   * Returns true if the value is NOT a boolean.
   */
  isNotBool: (value: unknown) => boolean;

  /**
   * Returns true if the value is false, null, or undefined
   */
  isFalse: (
    value: boolean | null | undefined,
  ) => value is false | null | undefined;

  /**
   * Returns true if the value is true
   */
  isTrue: (value: boolean | null | undefined) => value is true;

  /**
   * Returns true if the value has a 'then' function.
   */
  isThenable: (value: unknown) => value is PromiseLike<unknown>;

  /**
   * Returns true if the value contains a property that is NOT undefined
   */
  has: <T = unknown, P extends string | symbol = string | symbol>(
    value: T,
    prop: P,
  ) => value is T & Propped<P>;

  /**
   * Returns true if the value contains a property that is a function
   */
  hasFunc: <T = unknown, P extends string | symbol = string | symbol>(
    value: T,
    prop: P,
  ) => value is T & Propped<P, Func>;

  /**
   * Returns true if the value is a Promise
   */
  isPromise: <T = unknown>(value: unknown) => value is Promise<T>;

  /**
   * Throws an error if value is null or undefined, else value is returned.
   */
  require: <T>(value: T | null | undefined, argName: string) => T;

  // If value is null or undefined, then defaultValue is returned,
  // else value is returned.
  requireElse: <T>(value: T | null | undefined, defaultValue: T) => T;

  // If value is null or undefined, then defaultFn() is returned,
  // else value is returned.
  requireElseGet: <T>(value: T | null | undefined, defaultFn: Supplier<T>) => T;

  // If value is null or undefined, then an error is thrown, else
  // value is returned.
  requireNonNil: <T>(
    value: T | null | undefined,
    message?: string | (() => Error),
  ) => T;

  // If 'value' is null/undefined, then defaultValue is returned,
  // else if 'value' is a valid string, but cannot be parsed as
  // an integer, then an exception will be thrown.
  //
  // NOTE: 'value' is parsed as an integer with a default radix of 10.
  requireNumOrElse: (
    value: string | number | undefined | null,
    defaultValue: number,
    radix?: number,
  ) => number;
};
