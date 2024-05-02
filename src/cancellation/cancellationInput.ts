import type { CancellationToken } from "./CancellationToken.ts";
import type { TimeoutInput } from "../types.ts";
import { __isToken } from "./_utils.ts";
import { cancellationTimeout } from "./cancellationTimeout.ts";
import { __never } from "./_utils.ts";

export type CancellationInput = TimeoutInput | CancellationToken;

export const CancellationInput = {
  of(input?: CancellationInput): CancellationToken {
    return __isToken(input)
      ? input
      : input
      ? cancellationTimeout(input)
      : __never;
  },
};
