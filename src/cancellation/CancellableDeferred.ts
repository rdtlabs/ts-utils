import { CancellationError } from "./CancellationError.ts";
import { CancellablePromise } from "./CancellablePromise.ts";
import { type CancellationToken } from "./CancellationToken.ts";
import { type ErrorLike } from "../types.ts";

export interface CancellableDeferred<T = void> {
  readonly isDone: boolean;
  promise: CancellablePromise<T>;
  resolve: Resolve<T>;
  reject: (reason?: ErrorLike) => void;
}

export const CancellableDeferred = function <T = void>(
  options?: CancellationToken | ((error: CancellationError) => void) | {
    token?: CancellationToken;
    onCancel?: (error: CancellationError) => void;
  },
): {
  new <T = void>(
    cancellationToken?: CancellationToken,
    onCancel?: (error: CancellationError) => void,
  ): CancellableDeferred<T>;
} {
  if (!options) {
    // deno-lint-ignore no-explicit-any
    return create<T>() as any;
  }

  // deno-lint-ignore no-explicit-any
  return create<T>(options) as any;
} as unknown as {
  new <T = void>(
    options?: CancellationToken | ((error: CancellationError) => void) | {
      token?: CancellationToken;
      onCancel?: (error: CancellationError) => void;
    },
  ): CancellableDeferred<T>;
};

export function cancellableDeferred<T = void>(
  options?: CancellationToken | ((error: CancellationError) => void) | {
    token?: CancellationToken;
    onCancel?: (error: CancellationError) => void;
  },
): CancellableDeferred<T> {
  return create<T>(options);
}

// deno-lint-ignore explicit-function-return-type
function create<T>(
  options?: CancellationToken | ((error: CancellationError) => void) | {
    token?: CancellationToken;
    onCancel?: (error: CancellationError) => void;
  },
): CancellableDeferred<T> {
  let resolve!: Resolve<T>;
  let reject!: (reason?: unknown) => void;

  const promise = new CancellablePromise<T>((res, rej) => {
    resolve = res as Resolve<T>;
    reject = rej;
  }, options);

  return Object.freeze({
    promise,
    get isDone() {
      return promise.isDone;
    },
    resolve,
    reject,
  });
}

// utility type
type Resolve<T> = T extends void | undefined
  ? (value?: T | PromiseLike<T>) => void
  : (value: T | PromiseLike<T>) => void;
