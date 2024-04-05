import { InvalidArgumentError } from "./errors/InvalidArgumentError.ts";
import { type Func, type Supplier } from "./types.ts";

// deno-lint-ignore no-explicit-any
type Propped<K extends keyof any, TYPE = any> = {
  [P in K]: TYPE;
};

export const objects = {
  coalesce: <T>(nillable: T | undefined | null, alt: T): T => {
    return objects.isNil(nillable) ? alt : nillable;
  },
  isNil: (value: unknown): value is null | undefined => {
    return value === null || objects.isUndef(value);
  },
  isNotNil: <T>(value: T | null | undefined): value is T => {
    return !objects.isNil(value);
  },
  isStr: (value: unknown): value is string => {
    return value instanceof String || typeof value === "string";
  },
  isNum: (value: unknown): value is number => {
    return typeof value === "number";
  },
  isNotNum: (value: unknown): boolean => {
    return typeof value !== "number" || isNaN(value);
  },
  isSymbol: (value: unknown): value is symbol => {
    return typeof value === "symbol";
  },
  isUndef: (value: unknown): value is undefined => {
    return typeof value === "undefined";
  },
  isFunc: (value: unknown): value is Func => {
    return !objects.isNil(value) && typeof value === "function";
  },
  isObject: (value: unknown): value is object => {
    if (objects.isNil(value)) {
      return false;
    }

    const type = typeof value;
    return type === "object" || type === "function";
  },
  isDate: (value: unknown): value is Date => {
    return objects.isObject(value) && value instanceof Date;
  },
  isBool: (value: unknown): value is boolean => {
    return typeof value === "boolean";
  },
  isNotBool: (value: unknown): boolean => {
    return typeof value !== "boolean";
  },
  isFalse: (
    value: boolean | null | undefined,
  ): value is false | null | undefined => {
    return value !== true;
  },
  isTrue: (value: boolean | null | undefined): value is true => {
    return value === true;
  },
  isThenable: (value: unknown): value is PromiseLike<unknown> => {
    return objects.hasFunc(value, "then");
  },
  has: <T = unknown, P extends string | symbol = string | symbol>(
    value: T,
    prop: P,
  ): value is T & Propped<P> => {
    // deno-lint-ignore no-explicit-any
    return !!value && (value as any)[prop] !== undefined;
  },
  hasFunc: <T = unknown, P extends string | symbol = string | symbol>(
    value: T,
    prop: P,
  ): value is T & Propped<P, Func> => {
    // deno-lint-ignore no-explicit-any
    return !!value && typeof (value as any)[prop] === "function";
  },
  isPromise: <T = unknown>(value: unknown): value is Promise<T> => {
    return objects.hasFunc(value, "then") &&
      objects.hasFunc(value, "catch");
  },
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
};
