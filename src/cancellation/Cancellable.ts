import { fromIterableLike } from "../async/fromIterableLike.ts";
import type { IterableLike } from "../async/IterableLike.ts";
import { Promises } from "../async/Promises.ts";
import type { Callable, ErrorLike, TimeoutInput } from "../types.ts";
import type {
  CancellationController,
  CancellationToken,
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
import type { CancellationError } from "./CancellationError.ts";
import type { CancellationIterableOptions } from "./CancellationIterableOptions.ts";
import type { CancellationOptions } from "./CancellationOptions.ts";
import { cancellablePromise } from "./cancellablePromise.ts";

/**
 * Represents a set of utility functions and methods for working with cancellation tokens.
 */
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
  promise: <T>(
    p: Promise<T>,
    // deno-lint-ignore no-explicit-any
    options?: any,
  ) => {
    return cancellablePromise(p, options);
  },
  iterable: <T>(
    iterable: IterableLike<T>,
    // deno-lint-ignore no-explicit-any
    options?: any,
  ) => {
    return cancellableIterable(fromIterableLike(iterable), options);
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
}) as Cancellable;

/**
 * Represents a set of utility functions and methods for working with cancellation tokens.
 */
export interface Cancellable {
  /**
   * An inert, cancellation token that is always in a non-cancelled state and cannot be cancelled.
   */
  Never: CancellationToken;

  /**
   * Creates a cancellation controller from the provided cancellation token.
   * If no token is provided, a new cancellation token will be created.
   * @param token The cancellation token to create the controller from.
   * @returns The cancellation controller.
   */
  from(token?: CancellationToken): CancellationController;

  /**
   * Creates a new cancellation controller.
   * @returns The cancellation controller.
   */
  create(): CancellationController;

  /**
   * Creates a cancellation token that is already in the cancelled state.
   * @param reason The reason for the cancellation.
   * @returns The cancelled cancellation token.
   */
  cancelled(reason?: ErrorLike): CancellationToken;

  /**
   * Creates a cancellation token that will be cancelled after the specified timeout.
   * @param timeoutInput The timeout value or options for the cancellation token.
   * @returns The cancellation token.
   */
  timeout(timeoutInput: TimeoutInput): CancellationToken & Disposable;

  /**
   * Combines multiple cancellation tokens into a single token.
   * The resulting token will be cancelled if any of the input tokens are cancelled.
   * @param cancellations The cancellation tokens to combine.
   * @returns The combined cancellation token.
   */
  combine(...cancellations: CancellationToken[]): CancellationToken;

  /**
   * Creates a cancellation token that is linked to the provided AbortSignal.
   * The token will be cancelled when the AbortSignal is aborted.
   * @param signal The AbortSignal to link the cancellation token to.
   * @returns The cancellation token.
   */
  signal(signal: AbortSignal): CancellationToken;

  /**
   * Creates a cancellable iterable from the provided iterable.
   * @param iterable The iterable to make cancellable.
   * @param cancellationToken The cancellation token to associate with the iterable.
   * @returns An async generator that yields the values from the iterable.
   */
  iterable<T>(
    iterable: IterableLike<T>,
    cancellationToken?: CancellationToken,
  ): AsyncGenerator<T>;

  /**
   * Creates a cancellable iterable from the provided iterable.
   * @param iterable The iterable to make cancellable.
   * @param onCancel A callback function that will be called if the iterable is cancelled.
   * @returns An async generator that yields the values from the iterable.
   */
  iterable<T>(
    iterable: IterableLike<T>,
    onCancel: (error: CancellationError) => void,
  ): AsyncGenerator<T>;

  /**
   * Creates a cancellable iterable from the provided iterable.
   * @param iterable The iterable to make cancellable.
   * @param throwOnCancellation Specifies whether to throw a CancellationError when the iterable is cancelled.
   * @returns An async generator that yields the values from the iterable.
   */
  iterable<T>(
    iterable: IterableLike<T>,
    throwOnCancellation: boolean,
  ): AsyncGenerator<T>;

  /**
   * Creates a cancellable iterable from the provided iterable.
   * @param iterable The iterable to make cancellable.
   * @param options The options for the cancellable iterable.
   * @returns An async generator that yields the values from the iterable.
   */
  iterable<T>(
    iterable: IterableLike<T>,
    options?: CancellationIterableOptions,
  ): AsyncGenerator<T>;

  /**
   * Creates a cancellable promise from the provided promise.
   * @param promise The promise to make cancellable.
   * @param cancellationToken The cancellation token to associate with the promise.
   * @returns A promise that resolves or rejects with the value of the original promise.
   */
  promise<T>(
    promise: Promise<T>,
    cancellationToken?: CancellationToken,
  ): Promise<T>;

  /**
   * Creates a cancellable promise from the provided promise.
   * @param promise The promise to make cancellable.
   * @param defaultValueOnCancel A function that returns a default value when the promise is cancelled.
   * @returns A promise that resolves with the value of the original promise or the default value.
   */
  promise<T>(promise: Promise<T>, defaultValueOnCancel: () => T): Promise<T>;

  /**
   * Creates a cancellable promise from the provided promise.
   * @param promise The promise to make cancellable.
   * @param options The options for the cancellable promise.
   * @returns A promise that resolves or rejects with the value of the original promise.
   */
  promise<T>(promise: Promise<T>, options?: CancellationOptions): Promise<T>;

  /**
   * Checks if the provided value is a cancellation token.
   * @param cancellation The value to check.
   * @returns True if the value is a cancellation token, false otherwise.
   */
  isToken(cancellation: unknown): cancellation is CancellationToken;

  /**
   * Invokes the provided callable function or promise with the specified cancellation input.
   * @param callable The callable function or promise to invoke.
   * @param cancellation The cancellation input to associate with the invocation.
   * @returns A promise that resolves or rejects with the value of the invocation.
   */
  invoke<T>(
    callable: Callable<T | PromiseLike<T>>,
    cancellation?: CancellationInput,
  ): Promise<T>;
}
