import type { CancellationToken } from "../cancellation/CancellationToken.ts";
import type { Observable, Subscriber, Unsubscribe } from "./_rx.types.ts";
import { cancellableIterable } from "../cancellation/cancellableIterable.ts";

/**
 * Converts an async iterable into an Observable.
 *
 * @template T - The type of elements emitted by the Observable.
 * @param {AsyncIterable<T>} iterable - The async iterable to convert.
 * @param {CancellationToken} [cancellationToken] - Optional cancellation token.
 * @returns {Observable<T>} - The converted Observable.
 */
export function fromAsyncIterable<T>(
  iterable: AsyncIterable<T>,
  cancellationToken?: CancellationToken,
): Observable<T> {
  let isSubscribed = false;
  return {
    subscribe(sub: Subscriber<T>): Unsubscribe {
      if (isSubscribed) {
        throw new Error("Observable already has a subscriber");
      }

      if (!sub) {
        throw new Error("Subscriber is null or undefined");
      }

      isSubscribed = true;

      const cancellable = cancellableIterable(
        iterable,
        cancellationToken,
      );

      let done = false;
      const iterator = cancellable[Symbol.asyncIterator]();
      (async () => {
        try {
          while (!done) {
            const { done, value } = await iterator.next();
            if (done) {
              break;
            }

            sub.next?.(value);
          }
          sub.complete?.();
        } catch (e) {
          sub.error?.(e);
        }
      })();

      return () => {
        done = true;
        isSubscribed = false;
        iterator?.return?.(undefined);
      };
    },
  };
}
