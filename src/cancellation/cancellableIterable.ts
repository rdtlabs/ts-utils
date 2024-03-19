import CancellationError from "./CancellationError.ts";
import fromIterableLike, {
  type IterableLike,
} from "../async/fromIterableLike.ts";
import { type CancellationToken } from "./CancellationToken.ts";

// overload declarations
// deno-fmt-ignore
export default function cancellableIterable<T>(iterable: readonly T[], cancellationToken?: CancellationToken): AsyncIterable<T>; // deno-fmt-ignore
export default function cancellableIterable<T>(iterable: readonly PromiseLike<T>[], cancellationToken?: CancellationToken): AsyncIterable<T>; // deno-fmt-ignore
export default function cancellableIterable<T>(iterable: Iterable<T>, cancellationToken?: CancellationToken): AsyncIterable<T>; // deno-fmt-ignore
export default function cancellableIterable<T>(iterable: Iterable<PromiseLike<T>>, cancellationToken?: CancellationToken): AsyncIterable<T>; // deno-fmt-ignore
export default function cancellableIterable<T>(iterable: AsyncIterable<T>, cancellationToken?: CancellationToken): AsyncIterable<T>; // deno-fmt-ignore
export default function cancellableIterable<T>(iterable: PromiseLike<readonly T[]>, cancellationToken?: CancellationToken): AsyncIterable<T>; // deno-fmt-ignore
export default function cancellableIterable<T>(iterable: PromiseLike<readonly PromiseLike<T>[]>, cancellationToken?: CancellationToken): AsyncIterable<T>; // deno-fmt-ignore
export default function cancellableIterable<T>(iterable: PromiseLike<Iterable<T>>, cancellationToken?: CancellationToken): AsyncIterable<T>; // deno-fmt-ignore
export default function cancellableIterable<T>(iterable: PromiseLike<Iterable<PromiseLike<T>>>, cancellationToken?: CancellationToken): AsyncIterable<T>; // deno-fmt-ignore
export default function cancellableIterable<T>(iterable: PromiseLike<AsyncIterable<T>>, cancellationToken?: CancellationToken): AsyncIterable<T>; // deno-fmt-ignore
export default function cancellableIterable<T>(iterable: IterableLike<T>, cancellationToken?: CancellationToken): AsyncIterable<T>;

export default function cancellableIterable<T>(
  iterable: IterableLike<T>,
  token?: CancellationToken,
): AsyncIterable<T> {
  if (token?.isCancelled === true) {
    return {
      [Symbol.asyncIterator]: () => ({
        next: () => {
          return Promise.reject(new CancellationError(token));
        },
      }),
    };
  }

  const it = fromIterableLike(iterable);
  if (!token || token.state === "none") {
    return it;
  }

  return {
    [Symbol.asyncIterator]: () => {
      let cancel: (tk: CancellationToken) => void | undefined;
      const promise = new Promise<never>((_, reject) => {
        cancel = (tk: CancellationToken) => {
          reject(tk.reason);
        };
      });

      const unregister = token.register(cancel!);
      const iterator = it[Symbol.asyncIterator]();
      return {
        next: () => {
          try {
            return Promise.race([promise, iterator.next()]).then((value) => {
              if (value.done) {
                unregister();
              }
              return value;
            }).catch((e) => {
              unregister();
              if (!(e instanceof CancellationError)) {
                throw e;
              }
              return {
                done: true,
                value: undefined,
              };
            });
          } catch (e) {
            unregister();
            if (!(e instanceof CancellationError)) {
              return Promise.reject(e);
            }
            // deno-lint-ignore no-explicit-any
            return Promise.resolve<any>({
              done: true,
              value: undefined,
            });
          }
        },
      };
    },
  };
}
