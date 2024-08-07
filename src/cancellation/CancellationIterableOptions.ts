import type { CancellationError } from "./CancellationError.ts";
import type { CancellationToken } from "./CancellationToken.ts";

export type CancellationIterableOptions = {
  token?: CancellationToken;
  onCancel?: (error: CancellationError) => void;
  throwOnCancellation?: boolean;
};

export type CancellationIterableOptionsExtended =
  | CancellationIterableOptions
  | ((error: CancellationError) => void)
  | boolean
  | CancellationToken;

export const CancellationIterableOptions: {
  from: (
    options?: CancellationIterableOptionsExtended,
    defaults?: CancellationIterableOptions,
  ) => CancellationIterableOptions;
} = Object.freeze({
  from: (
    options?: CancellationIterableOptionsExtended,
    defaults?: CancellationIterableOptions,
  ): CancellationIterableOptions => {
    defaults ??= {};

    if (options === undefined) {
      return {
        token: defaults.token,
        onCancel: defaults.onCancel,
        throwOnCancellation: defaults?.throwOnCancellation === true,
      };
    }

    if (typeof options === "boolean") {
      return {
        token: defaults.token,
        onCancel: defaults.onCancel,
        throwOnCancellation: options === true,
      };
    }

    if (typeof options === "function") {
      return {
        token: defaults.token,
        throwOnCancellation: defaults.throwOnCancellation === true,
        onCancel: options,
      };
    }

    if ("throwIfCancelled" in options) {
      return {
        onCancel: defaults.onCancel,
        throwOnCancellation: defaults.throwOnCancellation === true,
        token: options,
      };
    }

    return {
      token: options.token ?? defaults.token,
      onCancel: options.onCancel ?? defaults.onCancel,
      throwOnCancellation: options.throwOnCancellation !== undefined
        ? options.throwOnCancellation === true
        : defaults.throwOnCancellation === true,
    };
  },
});
