// Public API — types from types.ts, runtime from value.ts.
// No _internal.ts exists. The brand symbol is closure-scoped in value.ts.

export type {
  AnyBrandedValue,
  AnyValueObject,
  Branded,
  CompositeValueObject,
  FlatBranded,
  ValidCompositeProps,
  ValidFlatProps,
  VALUE_OBJECT_BRAND,
  ValueObjectKind,
  ValuePrimitive,
  ValueObject,
  ValueMap,
  ValueSet,
} from "./types.ts";

export { ValueObject as VO } from "./types.ts";
