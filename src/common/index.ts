/**
 * This module contains various utilities for common tasks such as working with objects, strings,
 * encoding, deadlines, and more. These utilities are used across the library and are exported for
 * general use.
 * @module common
 */

export { objects } from "./objects.ts";
export { strings } from "./strings.ts";
export { base64 } from "./encoding/base64.ts";
export { once } from "./once.ts";
export * from "./Queue.ts";
export {
  Deadline as Deadline,
  deadline as deadline,
  DeadlineExceededError as DeadlineExceededError,
} from "./deadline.ts";
export { deriveTimeout } from "./deriveTimeout.ts";
export { type ErrorLike, type TimeoutInput } from "./types.ts";
