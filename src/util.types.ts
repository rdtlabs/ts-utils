export type InferType<
  T,
  K1 = undefined,
  K2 = undefined,
  K3 = undefined,
  K4 = undefined,
  K5 = undefined,
> = T extends null | undefined | never ? T // special case for `null | undefined` when not in `--strictNullChecks` mode
  : T extends object
    ? K1 extends undefined
      ? K2 extends undefined
        ? K3 extends undefined ? K4 extends undefined ? K5 extends undefined ? T
            : never
          : never
        : never
      : never
    : K1 extends keyof T ? InferType<T[K1], K2, K3, K4, K5>
    : never
  : T;

export type ConcatProperties<
  T,
  K1 extends string | number | undefined,
  K2 extends string | number | undefined = undefined,
  K3 extends string | number | undefined = undefined,
  K4 extends string | number | undefined = undefined,
  K5 extends string | number | undefined = undefined,
> = K1 extends keyof T
  ? K2 extends keyof T[K1]
    ? K3 extends keyof T[K1][K2]
      ? K4 extends keyof T[K1][K2][K3]
        ? K5 extends keyof T[K1][K2][K3][K4] ? CombineKeys<K1, K2, K3, K4, K5>
        : CombineKeys<K1, K2, K3, K4>
      : CombineKeys<K1, K2, K3>
    : CombineKeys<K1, K2>
  : CombineKeys<K1>
  : never;

type S<T, S extends string> = T extends undefined ? undefined
  : T extends number ? `${S}`
  : T extends string ? `${T}`
  : never;

export type CombineKeys<
  K1 extends string | number | undefined,
  K2 extends string | number | undefined = undefined,
  K3 extends string | number | undefined = undefined,
  K4 extends string | number | undefined = undefined,
  K5 extends string | number | undefined = undefined,
> = CombineKeysWith<".", K1, K2, K3, K4, K5>;

export type CombineKeysWith<
  C extends string,
  K1 extends string | number | undefined,
  K2 extends string | number | undefined = undefined,
  K3 extends string | number | undefined = undefined,
  K4 extends string | number | undefined = undefined,
  K5 extends string | number | undefined = undefined,
> = K1 extends string | number
  ? K2 extends string | number
    ? K3 extends string | number
      ? K4 extends string | number
        ? K5 extends string | number
          ? `${S<K1, "$1">}${C}${S<K2, "$2">}${C}${S<K3, "$3">}${C}${S<
            K4,
            "$4"
          >}${C}${S<K5, "$5">}`
        : `${S<K1, "$1">}${C}${S<K2, "$2">}${C}${S<K3, "$3">}${C}${S<K4, "$4">}`
      : `${S<K1, "$1">}${C}${S<K2, "$2">}${C}${S<K3, "$3">}`
    : `${S<K1, "$1">}${C}${S<K2, "$2">}`
  : `${S<K1, "$1">}`
  : never;
