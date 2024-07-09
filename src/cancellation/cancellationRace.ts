import { deferred } from "../async/Deferred.ts";
import type { CancellationError } from "./CancellationError.ts";
import type { CancellationToken } from "./CancellationToken.ts";
import { CancellationInput } from "./cancellationInput.ts";

type Raceable<T> =
  | PromiseLike<T>
  | PromiseLike<T>[]
  | (() => PromiseLike<T> | PromiseLike<T>[]);

/**
 * Races multiple promises against a cancellation token and returns a promise that resolves or rejects
 * with the result of the first promise that settles or the cancellation reason.
 *
 * @template T - The type of the resolved value of the promises.
 * @param {Raceable<T>} promises - The promises to race against.
 * @param {CancellationInput} [cancellation] - The cancellation input.
 * @param {(error: CancellationError) => void} [onCancel] - The callback function to be called when the
 *   cancellation is triggered.
 * @returns {Promise<T>} - A promise that resolves or rejects with the result of the first promise that
 *   settles or the cancellation reason.
 */
export function cancellationRace<T>(
  promises: Raceable<T>,
  cancellation?: CancellationInput,
  onCancel?: (error: CancellationError) => void,
): Promise<T> {
  const token = CancellationInput.of(cancellation);
  if (token.isCancelled) {
    if (onCancel) {
      queueMicrotask(() => onCancel(token.reason));
    }
    return Promise.reject(token.reason);
  }

  if (typeof promises === "function") {
    promises = promises();
  }

  const promisesArray = Array.isArray(promises) ? promises : [promises];
  if (!token || token.state === "none") {
    return Promise.race<T>(promisesArray);
  }

  const def = deferred();
  const cancel = (tk: CancellationToken) => {
    if (onCancel) {
      queueMicrotask(() => onCancel(tk.reason));
    }
    def.reject(tk.reason);
  };

  const unregister = token.register(cancel);
  if (promisesArray.length === 1) {
    return Promise.race<T>([
      def.promise,
      wrap(promisesArray[0], unregister),
    ]);
  }

  return Promise.race<T>([
    def.promise,
    ...promisesArray.map((p) => wrap(p, unregister)),
  ]);
}

// deno-lint-ignore no-explicit-any
const wrap = <T>(p: any, onFinally: () => void) => {
  if (typeof p.finally === "function") {
    return p.finally(onFinally);
  }

  return p.then(
    (value: T) => {
      onFinally();
      return value;
    },
    (err: unknown) => {
      onFinally();
      return Promise.reject(err);
    },
  );
};
