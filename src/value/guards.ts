import { hasBrand, readBrand } from "./_internal.ts";
import type { AnyBrandedValue, AnyValueObject, ValueObjectKind } from "./types.ts";

export type { ValueObjectKind };

/** Returns true if the object is a branded value object (flat or composite). */
export function isValueObject(obj: unknown): obj is AnyValueObject {
  if (!hasBrand<AnyValueObject>(obj)) {
    return false;
  }
  const kind = readBrand(obj as object);
  return kind === "flat" || kind === "composite";
}

/** Returns true if the object is a branded value object (flat or composite). */
export function isBrandedValueObject(obj: unknown): obj is AnyValueObject {
  return hasBrand<AnyValueObject>(obj) && (readBrand(obj as object) === "flat" || readBrand(obj as object) === "composite");
}

/** Returns true if the object is any branded value type (including map/set). */
export function isBrandedValue(obj: unknown): obj is AnyBrandedValue {
  return hasBrand<AnyBrandedValue>(obj);
}

/** Returns the brand kind of a branded value, or undefined if not branded. */
export function getValueKind(obj: object): ValueObjectKind | undefined {
  return readBrand(obj);
}

/** Returns true if the object is a flat (primitive-only) value object. */
export function isFlatValueObject(obj: unknown): boolean {
  return isBrandedValue(obj) && getValueKind(obj as object) === "flat";
}

/** Returns true if the object is a composite value object. */
export function isCompositeValueObject(obj: unknown): boolean {
  return isBrandedValue(obj) && getValueKind(obj as object) === "composite";
}
