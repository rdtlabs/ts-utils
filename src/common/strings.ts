import { type Supplier } from "./types.ts";

import { base64 } from "./encoding/base64.ts";
import { objects } from "./objects.ts";

export const strings = getStringUtils();

export default strings;

function getStringUtils(): StringUtils {
  return {
    coalesce: (
      ...values: (string | null | undefined)[]
    ): string | null => {
      for (const value of values) {
        if (!strings.isNilOrEmpty(value)) {
          return value;
        }
      }

      return null;
    },
    is: (value: unknown): value is string => {
      return typeof value === "string";
    },
    isNot: <T = string>(value: T): value is Exclude<T, string> => {
      return !strings.is(value);
    },
    isEmpty: (value: string | null | undefined): value is "" => {
      return strings.is(value) && value === "";
    },
    // NOTE: Will throw an exception if not a string/null/undefined.
    isNilOrEmpty: (
      value: string | null | undefined,
    ): value is "" | null | undefined => {
      if (objects.isNil(value)) {
        return true;
      }

      if (strings.is(value)) {
        return value === "";
      }

      throw new Error("value must be a string or null/undefined");
    },
    // NOTE: Will throw an exception if not a string/null/undefined.
    isNilOrWhitespace: (
      value: string | null | undefined,
    ): value is string | null | undefined => {
      // @ts-ignore: Unreachable code error
      return strings.isNilOrEmpty(value) || value.trim().length === 0;
    },
    // If value is an empty string or null/undefined, then defaultValue
    // is returned, else value is returned.
    // NOTE: Will throw an exception if value is not a string/null/undefined.
    requireElse: (
      value: string | null | undefined,
      defaultValue = "",
    ): string => {
      if (!strings.isNilOrEmpty(value)) {
        // @ts-ignore: Unreachable code error
        return value;
      }

      if (strings.is(defaultValue)) {
        return defaultValue;
      }

      throw new Error("value must be a string or null/undefined");
    },
    // If value is an empty string or null/undefined, then defaultFn() is returned,
    // else value is returned.
    // NOTE: Will throw an exception if value is not a string/null/undefined.
    requireElseGet: (
      value: string | null | undefined,
      defaultFn: Supplier<string>,
    ): string => {
      if (!strings.isNilOrEmpty(value)) {
        // @ts-ignore: Unreachable code error
        return value;
      }

      return objects.requireNonNil(defaultFn)();
    },
    // If strings are null/undefined, then they are considered equivalent.
    // NOTE: Will throw an exception if not a string/null/undefined.
    areEqual: (
      arg1: string | null | undefined,
      arg2: string | null | undefined,
      caseInsensitive = false,
    ): boolean => {
      if (strings.isNilOrEmpty(arg1)) {
        return strings.isNilOrEmpty(arg2);
      }

      if (strings.isNilOrEmpty(arg2)) {
        return false;
      }

      // @ts-ignore: Unreachable code error
      if (arg1.length !== arg2.length) {
        return false;
      }

      if (!caseInsensitive) {
        return arg1 === arg2;
      }

      // @ts-ignore: Unreachable code error
      return arg1.toUpperCase() == arg2.toUpperCase();
    },
    toBase64: (value: string, urlMode?: boolean): string => {
      return base64.toBase64(value, urlMode);
    },
    fromBase64: (base64Str: string, urlMode?: boolean): string => {
      return base64.fromBase64(base64Str, urlMode);
    },
  };
}

interface StringUtils {
  is(value: unknown): value is string;
  isNot(value: unknown): value is Exclude<unknown, string>;
  isEmpty(value: string | null | undefined): value is "";
  isNilOrEmpty(
    value: string | null | undefined,
  ): value is "" | null | undefined;
  isNilOrWhitespace(value: string | null | undefined): boolean;
  toBase64(value: string, urlMode?: boolean): string;
  fromBase64(base64Str: string, urlMode?: boolean): string;

  coalesce(
    ...values: (string | null | undefined)[]
  ): string | null | undefined;

  requireElse(
    value: string | null | undefined,
    defaultValue: string,
  ): string;

  requireElseGet(
    value: string | null | undefined,
    defaultFn: Supplier<string>,
  ): string;

  areEqual(
    arg1: string | null | undefined,
    arg2: string | null | undefined,
    caseInsensitive?: boolean,
  ): boolean;
}
