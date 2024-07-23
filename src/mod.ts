/**
 * This module contains various utilities for common tasks such as working with objects, strings,
 * encoding, deadlines, and more. These utilities are used across the library and are exported for
 * general use.
 * @module common
 */

export { objects } from "./objects.ts";
export { strings } from "./strings.ts";
export { Once, once } from "./once.ts";
export { Lazy, lazyFn, lazyObject } from "./lazy.ts";
export {
  Deadline as Deadline,
  deadline as deadline,
  DeadlineExceededError as DeadlineExceededError,
} from "./deadline.ts";
export * from "./disposer.ts";
export * from "./types.ts";
export * from "./List.ts";
export * from "./Maybe.ts";
