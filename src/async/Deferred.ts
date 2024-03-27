import { type CancellationToken } from "../cancellation/CancellationToken.ts";
import { cancellationRace } from "../cancellation/cancellationRace.ts";

export interface Deferred<T = void> {
  promise: Promise<T>;
  resolve: Resolve<T>;
  reject: (reason?: unknown) => void;
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

  const controller = create<T>();
  return {
    promise: cancellationRace(controller.promise, cancellationToken),
    resolve: controller.resolve,
    reject: controller.reject,
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
