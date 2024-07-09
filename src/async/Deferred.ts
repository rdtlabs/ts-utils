import type { CancellationToken } from "../cancellation/CancellationToken.ts";
import type { ErrorLike } from "../types.ts";
import { Promises } from "./Promises.ts";

/**
 * Represents a deferred computation that may produce a value of type `T`.
 */
export interface Deferred<T = void> {
  /**
   * A promise that resolves to the value produced by the deferred computation.
   */
  promise: Promise<T>;

  /**
   * Resolves the deferred computation with the given value.
   * @param value - The value to resolve the deferred computation with.
   */
  resolve: Resolve<T>;

  /**
   * Rejects the deferred computation with the given reason.
   * @param reason - The reason for rejecting the deferred computation.
   */
  reject: (reason?: unknown) => void;

  /**
   * Indicates whether the deferred computation has been resolved or rejected.
   */
  readonly isDone: boolean;
}

/**
 * Creates a new instance of `Deferred` with an optional cancellation token.
 * @param cancellationToken - An optional cancellation token.
 * @returns A new instance of `Deferred`.
 */
export const Deferred = function <T = void>(
  cancellationToken?: CancellationToken,
): {
  new <T = void>(
    cancellationToken?: CancellationToken,
  ): Deferred<T>;
} {
  if (!cancellationToken || cancellationToken.state === "none") {
    // deno-lint-ignore no-explicit-any
    return create<T>() as any;
  }

  let isDone = false;
  const controller = create<T>();
  return {
    promise: Promises.cancellable(controller.promise, cancellationToken),
    resolve: (value: T) => {
      isDone = true;
      controller.resolve(value);
    },
    reject: (err: ErrorLike) => {
      isDone = true;
      controller.reject(err);
    },
    get isDone() {
      return isDone;
    },
    // deno-lint-ignore no-explicit-any
  } as any;
} as unknown as {
  new <T = void>(
    cancellationToken?: CancellationToken,
  ): Deferred<T>;
};

/**
 * Creates a new instance of `Deferred` with an optional cancellation token.
 * @param cancellationToken - An optional cancellation token.
 * @returns A new instance of `Deferred`.
 */
export function deferred<T = void>(
  cancellationToken?: CancellationToken,
): Deferred<T> {
  return new Deferred<T>(cancellationToken);
}

function create<T>(): {
  promise: Promise<T>;
  resolve: Resolve<T>;
  reject: (reason?: unknown) => void;
} {
  let resolve!: Resolve<T>;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res as Resolve<T>;
    reject = rej;
  });

  return Object.seal({
    promise,
    resolve,
    reject,
  });
}

// utility type
type Resolve<T> = T extends void | undefined
  ? (value?: T | PromiseLike<T>) => void
  : (value: T | PromiseLike<T>) => void;
