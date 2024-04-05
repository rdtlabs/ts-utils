import { deferred } from "../async/Deferred.ts";
import { type TimeoutInput } from "../types.ts";
import { type CancellationToken } from "./CancellationToken.ts";
import { __isToken, __none } from "./_utils.ts";
import { cancellationTimeout } from "./cancellationTimeout.ts";

type Raceable<T> =
  | PromiseLike<T>
  | PromiseLike<T>[]
  | (() => PromiseLike<T> | PromiseLike<T>[]);

export function cancellationRace<T>(
  promises: Raceable<T>,
  cancellation?: TimeoutInput | CancellationToken,
): Promise<T> {
  const token = __isToken(cancellation)
    ? cancellation
    : cancellation
      ? cancellationTimeout(cancellation)
      : __none;

  if (token.isCancelled) {
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
  const cancel = (tk: CancellationToken) => def.reject(tk.reason);
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
