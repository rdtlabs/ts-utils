import type { CancellationToken } from "./CancellationToken.ts";
import type { TimeoutInput } from "../types.ts";
import { __isToken } from "./_utils.ts";
import { cancellationTimeout } from "./cancellationTimeout.ts";
import { __never } from "./_utils.ts";

/**
 * Represents an input for cancellation, which can be either a TimeoutInput or a CancellationToken.
 */
export type CancellationInput = TimeoutInput | CancellationToken;

/**
 * Provides a utility function to convert a CancellationInput into a CancellationToken.
 * @param input The CancellationInput to convert.
 * @returns The corresponding CancellationToken.
 */
export const CancellationInput = {
  of(input?: CancellationInput): CancellationToken {
    return __isToken(input)
      ? input
      : input
      ? cancellationTimeout(input)
      : __never;
  },
};
