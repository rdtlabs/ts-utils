import type { CancellationError } from "./CancellationError.ts";
import type { CancellationToken } from "./CancellationToken.ts";

export type CancellationOptions<T = void> = {
  token?: CancellationToken | undefined;
  onCancel?: ((error: CancellationError) => void) | undefined;
  defaultValueOnCancel?: (() => T) | undefined;
};

export type CancellationOptionsExtended<T = void> =
  | CancellationOptions<T>
  | (() => T)
  | CancellationToken;

export const CancellationOptions: {
  from: <T = void>(
    options?: CancellationOptionsExtended<T> | undefined,
    defaults?: CancellationOptions<T> | undefined,
  ) => CancellationOptions<T>;
} = Object.freeze({
  from: <T = void>(
    options?: CancellationOptionsExtended<T> | undefined,
    defaults?: CancellationOptions<T> | undefined,
  ): CancellationOptions<T> => {
    if (!options) {
      return defaults ?? {};
    }

    defaults ??= {};

    if (typeof options === "function") {
      return {
        token: defaults.token,
        onCancel: defaults.onCancel,
        defaultValueOnCancel: options,
      };
    }

    if ("throwIfCancelled" in options) {
      return {
        token: options,
        onCancel: defaults.onCancel,
        defaultValueOnCancel: defaults.defaultValueOnCancel,
      };
    }

    return {
      onCancel: options.onCancel ?? defaults.onCancel,
      defaultValueOnCancel: options.defaultValueOnCancel,
      token: options.token ?? defaults.token,
    };
  },
});
