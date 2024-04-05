import type { BufferStrategyOptions } from "../buffer/BufferLike.ts";
import type { ErrorLike } from "../types.ts";
import type { CancellationToken } from "../cancellation/CancellationToken.ts";
import type { Observable } from "./_rx.types.ts";
import { Done } from "../done.ts";
import { cancellableIterable } from "../cancellation/cancellableIterable.ts";
import { asyncQueue } from "./queue/asyncQueue.ts";

export function fromObservable<T>(
  observable: Observable<T>,
  options?: {
    bufferStrategy?: BufferStrategyOptions<T>;
    bufferSize?: number;
    cancellationToken?: CancellationToken;
  },
): AsyncIterable<T> & Disposable {
  // deno-lint-ignore no-explicit-any
  if (!options && (observable as any)[Symbol.asyncIterator]) {
    return {
      [Symbol.dispose]: () => dispose(Done),
      [Symbol.asyncIterator]: () => {
        // deno-lint-ignore no-explicit-any
        return (observable as any)[Symbol.asyncIterator]();
      },
    };
  }

  const disposables = new Array<() => void>();
  const buffer = asyncQueue<T>({
    bufferSize: options?.bufferSize ?? Infinity,
    bufferStrategy: options?.bufferStrategy,
  });

  disposables.push(() => buffer[Symbol.dispose]());

  // deno-lint-ignore no-explicit-any
  let done: Done | ErrorLike | any | undefined;

  // deno-lint-ignore no-explicit-any
  const dispose = (v: any) => {
    if (!done) {
      done = v;
      disposables.forEach((d) => d());
    }
  };

  disposables.push(observable.subscribe({
    next: (value) => {
      if (!done) {
        buffer.enqueue(value);
      }
    },
    error: (e) => {
      dispose(e);
    },
    complete: () => {
      dispose(Done);
    },
  }));

  const cancellable = cancellableIterable(
    buffer,
    options?.cancellationToken,
  );

  return {
    [Symbol.dispose]: () => dispose(Done),
    [Symbol.asyncIterator]: () => {
      if (done) {
        if (Done.is(done)) {
          throw new Error(
            "Observable is already completed or " +
              "iterator was asked to stop via the return option",
          );
        }
        throw done;
      }

      const it = cancellable[Symbol.asyncIterator]();
      return {
        next: () => it.next(),
        // deno-lint-ignore no-explicit-any
        return: async (value: any) => {
          dispose(value);
          return await { done: true, value: undefined };
        },
      };
    },
  };
}
