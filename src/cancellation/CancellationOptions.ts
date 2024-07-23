import type { CancellationError } from "./CancellationError.ts";
import type { CancellationToken } from "./CancellationToken.ts";

export type CancellationOptions<T = void> = {
  token?: CancellationToken;
  onCancel?: (error: CancellationError) => void;
  defaultValueOnCancel?: () => T;
};

export type CancellationOptionsExtended<T = void> =
  | CancellationOptions<T>
  | (() => T)
  | CancellationToken;

export const CancellationOptions: {
  from: <T = void>(
    options?: CancellationOptionsExtended<T>,
    defaults?: CancellationOptions<T>,
  ) => CancellationOptions<T>
} = Object.freeze({
  from: <T = void>(
    options?: CancellationOptionsExtended<T>,
    defaults?: CancellationOptions<T>,
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
