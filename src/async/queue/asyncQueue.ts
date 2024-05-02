import {
  QueueClosedError,
  QueueFullError,
  QueueReadOnlyError,
} from "./errors.ts";
import { Deferred } from "../Deferred.ts";
import { __getBufferFromOptions, __getQueueResolvers } from "./_utils.ts";
import type { AsyncQueue, QueueOptions } from "./types.ts";
import type { MaybeResult } from "../../types.ts";
import type { CancellationToken } from "../../cancellation/CancellationToken.ts";

type QueueState = "rw" | "r" | "-rw";

/**
 * asyncQueue creates a new async queue with the given {@linkcode QueueOptions options}.
 *
 * @example
 * ```typescript
 * const queue = asyncQueue<number>({
 *   bufferSize: 2,
 *   bufferStrategy: "fixed",
 * });
 *
 * queue.enqueue(1);
 * queue.enqueue(2));
 * queue.enqueue(3); // throws QueueFullError
 * queue.setReadOnly();
 *
 * console.log(queue.tryDequeue()); // prints { value: 1, ok: true }
 * console.log(await queue.dequeue()); // prints 2 and closes the queue
 * ```
 *
 * @example
 * ```typescript
 * // Iterating over the queue
 * const queue = asyncQueue<number>();
 * queue.enqueue(1);
 * queue.enqueue(2);
 * queue.enqueue(3);
 *
 * queue.setReadOnly();
 *
 * let count = 1;
 * for await (const item of queue) {
 *   assert(item === count++);
 * }
 *
 * ```
 *
 * @example
 * ```typescript
 * // Awaiting dequeues
 * const queue = asyncQueue<number>();
 * const dequeuers = new Array<Promise<number>>();
 *
 * dequeuers.push(queue.dequeue());
 * dequeuers.push(queue.dequeue());
 * dequeuers.push(queue.dequeue());
 *
 * queueMicrotask(() => queue.enqueue(1));
 * queueMicrotask(() => queue.enqueue(2));
 * queueMicrotask(() => queue.enqueue(3));
 *
 * queue.setReadOnly();
 *
 * const all = await Promise.all(dequeuers);
 *
 * all.forEach((value, index) => {
 *   assert(value === index + 1);
 * });
 *
 * ```
 * @param options: The buffer options used to create the queue.
 */
export function asyncQueue<T>(
  options: QueueOptions<T> = { bufferSize: Infinity },
): AsyncQueue<T> {
  const { dequeueResolvers, enqueueResolver } = __getQueueResolvers<T>();
  const _buffer = __getBufferFromOptions<T>(options);
  let _onClose: Deferred<void> | undefined;
  let _state: 0 | 1 | 2 = 0;

  function enqueueUnsafe(item: T): void {
    while (!dequeueResolvers.isEmpty) {
      const resolver = dequeueResolvers.dequeue()!;
      if (!resolver.getIsCancelled()) {
        return resolver.resolve(item);
      }
    }

    try {
      _buffer.write(item);
      // deno-lint-ignore no-explicit-any
    } catch (e: any) {
      throw e.name === "BufferFullError" ? new QueueFullError() : e;
    }
  }

  const queue = {
    get isClosed(): boolean {
      return _state === 2;
    },
    get size(): number {
      return _buffer.size;
    },
    get isEmpty(): boolean {
      return _buffer.isEmpty;
    },
    get isFull(): boolean {
      return _buffer.isFull;
    },
    get state(): QueueState {
      return _state === 0 ? "rw" : _state === 1 ? "r" : "-rw";
    },
    close(): void {
      this[Symbol.dispose]();
    },
    onClose(): Promise<void> {
      if (!_onClose) {
        if (queue.isClosed) {
          return Promise.resolve();
        }
        _onClose = new Deferred<void>();
      }

      return _onClose.promise;
    },
    setReadOnly(): void {
      if (_state === 2) {
        throw new QueueClosedError();
      }

      _state = 1;
      if (queue.isEmpty) {
        this[Symbol.dispose]();
      }
    },
    tryEnqueue(item: T): boolean {
      if (_state !== 0) {
        return false;
      }

      try {
        enqueueUnsafe(item);
        return true;
      } catch (e) {
        if (e instanceof QueueFullError) {
          return false;
        }
        throw e;
      }
    },
    enqueue(item: T): void {
      if (_state === 2) {
        throw new QueueClosedError();
      }

      if (_state === 1) {
        throw new QueueReadOnlyError();
      }

      enqueueUnsafe(item);
    },
    dequeue(cancellationToken?: CancellationToken): Promise<T> {
      if (_state === 2) {
        return Promise.reject(new QueueClosedError());
      }

      if (cancellationToken?.isCancelled === true) {
        return Promise.reject(cancellationToken.reason);
      }

      if (!queue.isEmpty) {
        return Promise.resolve(_buffer.read()!);
      }

      if (_state === 0) {
        if (!cancellationToken || cancellationToken.state === "none") {
          return new Promise<T>(enqueueResolver);
        }

        return new Promise<T>((resolve, reject) =>
          enqueueResolver(resolve, reject, () => cancellationToken.isCancelled)
        );
      }

      this[Symbol.dispose]();

      return Promise.reject(
        new QueueClosedError(
          "Queue is read-only and has been exhausted of its items",
        ),
      );
    },
    tryDequeue(): MaybeResult<T> {
      if (_state === 2) {
        throw new QueueClosedError();
      }

      if (!queue.isEmpty) {
        return { value: _buffer.read()!, ok: true };
      }

      if (_state === 1) {
        this[Symbol.dispose]();
      }

      return { ok: false };
    },
    [Symbol.dispose](): void {
      if (_state === 2) {
        return;
      }

      _state = 2;
      _buffer.clear();

      for (const resolver of dequeueResolvers.toBufferLike()) {
        if (!resolver.getIsCancelled()) {
          resolver.reject(new QueueClosedError());
        }
      }

      if (_onClose) {
        _onClose.resolve();
      }
    },
    [Symbol.asyncIterator](): AsyncIterator<T> {
      return {
        next: async () => {
          try {
            return { value: await queue.dequeue(), done: false };
          } catch (e) {
            if ((e instanceof QueueClosedError)) {
              return { done: true };
            }
            throw e;
          }
        },
      } as AsyncIterator<T>;
    },
  };

  return queue;
}
