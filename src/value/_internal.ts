/**
 * @internal — Do not import from this module directly.
 * The runtime brand symbol is private to the value object system.
 * All public access goes through guards.ts.
 */

import type { ValueObjectKind } from "./types.ts";

/** The runtime brand symbol. Never exported from the public API. */
export const _runtimeBrand: unique symbol = Symbol("ValueObject");
export type _runtimeBrand = typeof _runtimeBrand;

/** Injects the brand onto an object using a non-enumerable, non-writable, non-configurable property. */
export function applyBrand<T extends object>(
  obj: T,
  kind: ValueObjectKind,
): T {
  Object.defineProperty(obj, _runtimeBrand, {
    value: kind,
    enumerable: false,
    writable: false,
    configurable: false,
  });
  return obj;
}

/** Reads the brand from an object, or undefined if not branded. */
export function readBrand(obj: object): ValueObjectKind | undefined {
  return (obj as Record<symbol, unknown>)[_runtimeBrand] as
    | ValueObjectKind
    | undefined;
}

/** Returns true if the object is a branded object. */
export function hasBrand<T>(obj: unknown): obj is T {
  return typeof obj === "object" && obj !== null && _runtimeBrand in obj;
}
