import { fromIterableLike } from "../async/fromIterableLike.ts";
import { type IterableLike } from "../async/fromIterableLike.ts";
import { Promises } from "../async/Promises.ts";
import { type Callable, type ErrorLike, type TimeoutInput } from "../types.ts";
import {
  type CancellationController,
  type CancellationToken,
} from "./CancellationToken.ts";
import { __isToken, __never } from "./_utils.ts";
import { cancellableIterable } from "./cancellableIterable.ts";
import { cancellationSignal } from "./cancellationSignal.ts";
import { cancellationTimeout } from "./cancellationTimeout.ts";
import { cancelledToken } from "./cancelledToken.ts";
import { combineTokens } from "./combineTokens.ts";
import { createCancellation } from "./createCancellation.ts";
import { fromCancellation } from "./fromCancellation.ts";
import { CancellationInput } from "./cancellationInput.ts";

export const Cancellable = Object.freeze({
  // An inert, cancellation token that is always in
  // a non-cancelled state and cannot be cancelled.
  Never: __never,
  from: (token?: CancellationToken) => fromCancellation(token),
  create: () => createCancellation(),
  cancelled: (reason?: ErrorLike) => cancelledToken(reason),
  timeout: (timeoutInput: TimeoutInput) => {
    return cancellationTimeout(timeoutInput);
  },
  combine: (...cancellations: CancellationToken[]) => {
    return combineTokens(...cancellations);
  },
  signal: (signal: AbortSignal) => cancellationSignal(signal),

  iterable: <T>(
    iterable: IterableLike<T>,
    token?: CancellationToken,
  ) => {
    return cancellableIterable(fromIterableLike(iterable), token);
  },
  isToken: (cancellation: unknown): cancellation is CancellationToken => {
    return __isToken(cancellation);
  },
  invoke: <T>(
    callable: Callable<T | PromiseLike<T>>,
    cancellation?: CancellationInput,
  ) => {
    try {
      return Promises.cancellable(
        Promise.resolve(callable()),
        CancellationInput.of(cancellation),
      );
    } catch (error) {
      return Promise.reject(error);
    }
  },
}) as {
  Never: CancellationToken;
  from: (token?: CancellationToken) => CancellationController;
  create: () => CancellationController;
  cancelled: (reason?: ErrorLike) => CancellationToken;
  timeout: (timeoutInput: TimeoutInput) => CancellationToken & Disposable;
  combine: (...cancellations: CancellationToken[]) => CancellationToken;
  signal: (signal: AbortSignal) => CancellationToken;
  iterable: <T>(
    iterable: IterableLike<T>,
    token?: CancellationToken,
  ) => AsyncIterable<T>;
  isToken: (cancellation: unknown) => cancellation is CancellationToken;
  invoke: <T>(
    callable: Callable<T | PromiseLike<T>>,
    cancellation?: CancellationInput,
  ) => Promise<T>;
};
