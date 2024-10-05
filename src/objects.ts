import { InvalidArgumentError } from "./errors/error.types.ts";
import type { Func, Supplier } from "./types.ts";

// deno-lint-ignore no-explicit-any
type Propped<K extends keyof any, TYPE = any> = {
  [P in K]: TYPE;
};

/**
 * Utility functions for working with objects.
 */
export const objects = {
  /**
   * Returns the first non-null/undefined value.
   */
  coalesce: <T>(nillable: T | undefined | null, alt: T): T => {
    return objects.isNil(nillable) ? alt : nillable;
  },
  /**
   * Returns true if the value is null or undefined.
   */
  isNil: (value: unknown): value is null | undefined => {
    return value === null || objects.isUndef(value);
  },
  /**
   * Returns true if the value is NOT null or undefined.
   */
  isNotNil: <T>(value: T | null | undefined): value is T => {
    return !objects.isNil(value);
  },
  /**
   * Returns true if the value is a string.
   */
  isStr: (value: unknown): value is string => {
    return value instanceof String || typeof value === "string";
  },
  /**
   * Returns true if the value is a number.
   */
  isNum: (value: unknown): value is number => {
    return typeof value === "number";
  },
  /**
   * Returns true if the value is NOT a number.
   */
  isNotNum: (value: unknown): boolean => {
    return typeof value !== "number" || isNaN(value);
  },
  /**
   * Returns true if the value is a symbol.
   */
  isSymbol: (value: unknown): value is symbol => {
    return typeof value === "symbol";
  },
  /**
   * Returns true if the value is undefined.
   */
  isUndef: (value: unknown): value is undefined => {
    return typeof value === "undefined";
  },
  /**
   * Returns true if the value is a function.
   */
  isFunc: (value: unknown): value is Func => {
    return !objects.isNil(value) && typeof value === "function";
  },
  /**
   * Returns true if the value is an object.
   */
  isObject: (value: unknown): value is object => {
    if (objects.isNil(value)) {
      return false;
    }

    const type = typeof value;
    return type === "object" || type === "function";
  },
  /**
   * Returns true if the value is a Date.
   */
  isDate: (value: unknown): value is Date => {
    return objects.isObject(value) && value instanceof Date;
  },
  /**
   * Returns true if the value is a boolean.
   */
  isBool: (value: unknown): value is boolean => {
    return typeof value === "boolean";
  },
  /**
   * Returns true if the value is NOT a boolean.
   */
  isNotBool: (value: unknown): boolean => {
    return typeof value !== "boolean";
  },
  /**
   * Returns true if the value is false, null, or undefined
   */
  isFalse: (
    value: boolean | null | undefined,
  ): value is false | null | undefined => {
    return value !== true;
  },
  /**
   * Returns true if the value is true
   */
  isTrue: (value: boolean | null | undefined): value is true => {
    return value === true;
  },
  /**
   * Returns true if the value has a 'then' function.
   */
  isThenable: (value: unknown): value is PromiseLike<unknown> => {
    return objects.hasFunc(value, "then");
  },
  /**
   * Returns true if the value contains a property that is NOT undefined
   */
  has: <T = unknown, P extends string | symbol = string | symbol>(
    value: T,
    prop: P,
  ): value is T & Propped<P> => {
    // deno-lint-ignore no-explicit-any
    return !!value && (value as any)[prop] !== undefined;
  },
  /**
   * Returns true if the value contains a property that is a function
   */
  hasFunc: <T = unknown, P extends string | symbol = string | symbol>(
    value: T,
    prop: P,
  ): value is T & Propped<P, Func> => {
    // deno-lint-ignore no-explicit-any
    return !!value && typeof (value as any)[prop] === "function";
  },
  /**
   * Returns true if the value is a Promise
   */
  isPromise: <T = unknown>(value: unknown): value is Promise<T> => {
    return value instanceof Promise;
  },
  /**
   * Throws an error if value is null or undefined, else value is returned.
   */
  require: <T>(value: T | null | undefined, argName: string): T => {
    if (objects.isNotNil(value)) {
      return value;
    }

    throw new Error(`Argument '${argName}' cannot be undefined/null`);
  },
  // If value is null or undefined, then defaultValue is returned,
  // else value is returned.
  requireElse: <T>(value: T | null | undefined, defaultValue: T): T => {
    if (objects.isNotNil(value)) {
      return value;
    }

    return defaultValue;
  },
  // If value is null or undefined, then defaultFn() is returned,
  // else value is returned.
  requireElseGet: <T>(
    value: T | null | undefined,
    defaultFn: Supplier<T>,
  ): T => {
    if (objects.isNotNil(value)) {
      return value;
    }

    return objects.requireNonNil(defaultFn)();
  },
  // If value is null or undefined, then an error is thrown, else
  // value is returned.
  requireNonNil: <T>(
    value: T | null | undefined,
    message?: string | (() => Error),
  ): T => {
    if (objects.isNotNil(value)) {
      return value;
    }

    if (typeof message === "function") {
      throw message();
    }

    throw new Error(message ?? "value is required");
  },
  // If 'value' is null/undefined, then defaultValue is returned,
  // else if 'value' is a valid string, but cannot be parsed as
  // an integer, then an exception will be thrown.
  //
  // NOTE: 'value' is parsed as an integer with a default radix of 10.
  requireNumOrElse: (
    value: string | number | undefined | null,
    defaultValue: number,
    radix?: number,
  ): number => {
    if (objects.isNil(value)) {
      return defaultValue;
    }

    const parseResult = typeof value === "number"
      ? value
      : parseInt(value, radix ?? 10);

    if (isNaN(parseResult)) {
      throw new InvalidArgumentError(
        `value '${value}' could not be parsed as a number`,
      );
    }

    return parseResult;
  },
} as objects;

type objects = {
  coalesce: <T>(nillable: T | undefined | null, alt: T) => T;
  isNil: (value: unknown) => value is null | undefined;
  isNotNil: <T>(value: T | null | undefined) => value is T;
  isStr: (value: unknown) => value is string;
  isNum: (value: unknown) => value is number;
  isNotNum: (value: unknown) => boolean;
  isSymbol: (value: unknown) => value is symbol;
  isUndef: (value: unknown) => value is undefined;
  isFunc: (value: unknown) => value is Func;
  isObject: (value: unknown) => value is object;
  isDate: (value: unknown) => value is Date;
  isBool: (value: unknown) => value is boolean;
  isNotBool: (value: unknown) => boolean;
  isFalse: (
    value: boolean | null | undefined,
  ) => value is false | null | undefined;
  isTrue: (value: boolean | null | undefined) => value is true;
  isThenable: (value: unknown) => value is PromiseLike<unknown>;
  has: <T = unknown, P extends string | symbol = string | symbol>(
    value: T,
    prop: P,
  ) => value is T & Propped<P>;
  hasFunc: <T = unknown, P extends string | symbol = string | symbol>(
    value: T,
    prop: P,
  ) => value is T & Propped<P, Func>;
  isPromise: <T = unknown>(value: unknown) => value is Promise<T>;
  require: <T>(value: T | null | undefined, argName: string) => T;
  requireElse: <T>(value: T | null | undefined, defaultValue: T) => T;
  requireElseGet: <T>(value: T | null | undefined, defaultFn: Supplier<T>) => T;
  requireNonNil: <T>(
    value: T | null | undefined,
    message?: string | (() => Error),
  ) => T;
  requireNumOrElse: (
    value: string | number | undefined | null,
    defaultValue: number,
    radix?: number,
  ) => number;
};
