// Public API — types + guards. Does NOT export _internal.ts.

export type {
  AnyBrandedValue,
  AnyValueObject,
  Branded,
  CompositeValueObject,
  ValidCompositeProps,
  ValidFlatProps,
  ValueMap,
  ValueObject,
  ValuePrimitive,
  ValueSet,
} from "./types.ts";

export {
  getValueKind,
  isBrandedValue,
  isCompositeValueObject,
  isFlatValueObject,
  isValueObject,
} from "./guards.ts";

export type { ValueObjectKind } from "./guards.ts";
