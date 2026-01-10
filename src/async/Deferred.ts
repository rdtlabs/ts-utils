import type { CancellationToken } from "../cancellation/CancellationToken.ts";
import { CancellationError } from "../cancellation/CancellationError.ts";
import type { ErrorLike } from "../types.ts";

const PENDING = "pending";
const RESOLVED = "resolved";
const REJECTED = "rejected";
const REJECTED_CANCELLED = "rejected_cancelled";

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

  /**
   * The current status of the deferred computation.
   */
  readonly status:
    | typeof PENDING
    | typeof RESOLVED
    | typeof REJECTED
    | typeof REJECTED_CANCELLED;
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
  if (cancellationToken?.isCancelled === true) {
    return (Object.freeze({
      promise: Promise.reject(
        cancellationToken.reason ?? new CancellationError(cancellationToken),
      ),
      resolve: (() => {}) as Resolve<T>,
      reject: (() => {}) as (reason?: unknown) => void,
      get isDone() {
        return true;
      },
      get status() {
        return "rejected_cancelled";
      },
      // deno-lint-ignore no-explicit-any
    }) as any);
  }

  let status = PENDING;
  const controller = create<T>();
  if (cancellationToken && cancellationToken.state !== "none") {
    const unregister = cancellationToken.register((token) => {
      if (status === PENDING) {
        status = REJECTED_CANCELLED;
        controller.reject(token.reason ?? new CancellationError(token));
      }
    });
    controller.promise = controller.promise.finally(unregister);
  }

  return Object.freeze({
    promise: controller.promise,
    resolve: (value: T) => {
      if (status === PENDING) {
        status = RESOLVED;
        controller.resolve(value);
      }
    },
    reject: (err: ErrorLike) => {
      if (status === PENDING) {
        status = REJECTED;
        controller.reject(err);
      }
    },
    get isDone() {
      return status.startsWith(PENDING) === false;
    },
    get status() {
      return status;
    },
    // deno-lint-ignore no-explicit-any
  } as any);
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

  return {
    promise,
    resolve,
    reject,
  };
}

// utility type
type Resolve<T> = T extends void | undefined ? () => void
  : (value: T | PromiseLike<T>) => void;
