import type { CancellationToken } from "../cancellation/CancellationToken.ts";
import type { ErrorLike } from "../types.ts";
import { Promises } from "./Promises.ts";

export interface Deferred<T = void> {
  promise: Promise<T>;
  resolve: Resolve<T>;
  reject: (reason?: unknown) => void;
  readonly isDone: boolean;
}

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

export function deferred<T = void>(
  cancellationToken?: CancellationToken,
): Deferred<T> {
  return new Deferred<T>(cancellationToken);
}

// deno-lint-ignore explicit-function-return-type
function create<T>() {
  let resolve!: Resolve<T>;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res as Resolve<T>;
    reject = rej;
  });

  return Object.freeze({
    promise,
    resolve,
    reject,
  });
}

// utility type
type Resolve<T> = T extends void | undefined
  ? (value?: T | PromiseLike<T>) => void
  : (value: T | PromiseLike<T>) => void;
