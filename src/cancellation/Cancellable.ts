import { IterableLike } from "../async/fromIterableLike.ts";
import {
  type Callable,
  type ErrorLike,
  type TimeoutInput,
} from "../common/types.ts";
import { type CancellationToken } from "./CancellationToken.ts";
import { __isToken, __none } from "./_utils.ts";
import cancellableIterable from "./cancellableIterable.ts";
import cancellationRace from "./cancellationRace.ts";
import cancellationSignal from "./cancellationSignal.ts";
import cancellationTimeout from "./cancellationTimeout.ts";
import cancelledToken from "./cancelledToken.ts";
import combineTokens from "./combineTokens.ts";
import createCancellation from "./createCancellation.ts";
import fromCancellation from "./fromCancellation.ts";

const Cancellable = Object.freeze({
  // An inert, cancellation token that is always in
  // a non-cancelled state and cannot be cancelled.
  None: __none,
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
  race: <T>(
    promises: Promise<T> | Promise<T>[],
    cancellation?: TimeoutInput | CancellationToken,
  ) => {
    return cancellationRace(promises, cancellation);
  },
  iterable: <T>(
    iterable: IterableLike<T>,
    token?: CancellationToken,
  ) => {
    return cancellableIterable(iterable, token);
  },
  isToken: (cancellation: unknown): cancellation is CancellationToken => {
    return __isToken(cancellation);
  },
  invoke: <T>(
    callable: Callable<T | PromiseLike<T>>,
    cancellation?: TimeoutInput | CancellationToken,
  ) => {
    const token = __isToken(cancellation)
      ? cancellation
      : cancellation
      ? cancellationTimeout(cancellation)
      : __none;

    try {
      return Cancellable.race(
        Promise.resolve(callable()),
        token,
      );
    } catch (error) {
      return Promise.reject(error);
    }
  },
});

export default Cancellable;
