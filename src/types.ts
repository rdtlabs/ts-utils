import type { Deadline } from "./deadline.ts";

// deno-lint-ignore no-explicit-any
export type Func = (...args: any[]) => any;
export type Func0<T> = () => T;
export type Func1<T, R> = (t: T) => R;
export type Func2<T, U, R> = (t: T, u: U) => R;
export type Func3<T, U, V, R> = (t: T, u: U, v: V) => R;

// deno-lint-ignore no-explicit-any
export type EventHandler<T = any> = (event: T) => void;
export type Nullable<T> = T | null;
export type Defined<T> = T extends undefined ? never : T;
export type NotNil<T> = T extends null | undefined ? never : T;
export type Nil<T> = T extends null | undefined ? T : never;
export type NonNil<T> = T extends null | undefined ? never : T;
// deno-lint-ignore no-explicit-any
export type Callable<T = any> = () => T;
export type Supplier<T> = () => T;
export type ErrorLike = Error | string;

/**
 * A type representing a value that may or may not be present.
 */
export type MaybeResult<T> = { value: T; ok: true } | {
  value?: undefined;
  ok: false;
};

/**
 * A type representing a time value as a number of milliseconds,
 * Date, or Deadline
 */
export type TimeoutInput = number | Date | Deadline;

/**
 * Utility functions for working with timeouts.
 */
export const TimeoutInput: {
  deriveTimeout(timeout: TimeoutInput): number;
} = {
  deriveTimeout(timeout: TimeoutInput): number {
    if (timeout instanceof Date) {
      return timeout.getTime() - Date.now();
    }

    if (typeof timeout === "number") {
      return timeout;
    }

    if (typeof timeout?.remainingMillis === "number") {
      return timeout.remainingMillis;
    }

    throw new TypeError("Invalid timeout");
  },
};
