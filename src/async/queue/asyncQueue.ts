import {
  QueueClosedError,
  QueueFullError,
  QueueReadOnlyError,
} from "./errors.ts";
import { Deferred } from "../Deferred.ts";
import { __getBufferFromOptions, __getQueueResolvers } from "./_utils.ts";
import { type AsyncQueue, type QueueOptions } from "./types.ts";
import { MaybeResult } from "../../common/types.ts";

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

  const queue = {
    get isClosed() {
      return _state === 2;
    },
    get size() {
      return _buffer.size;
    },
    get isEmpty() {
      return _buffer.isEmpty;
    },
    get state(): QueueState {
      return _state === 0 ? "rw" : _state === 1 ? "r" : "-rw";
    },
    close() {
      this[Symbol.dispose]();
    },
    onClose() {
      if (!_onClose) {
        if (queue.isClosed) {
          return Promise.resolve();
        }
        _onClose = new Deferred<void>();
      }

      return _onClose.promise;
    },
    setReadOnly() {
      if (_state === 2) {
        throw new QueueClosedError();
      }

      _state = 1;
      if (queue.isEmpty) {
        this[Symbol.dispose]();
      }
    },
    enqueue(item: T) {
      if (_state === 2) {
        throw new QueueClosedError();
      }

      if (_state === 1) {
        throw new QueueReadOnlyError();
      }

      if (!dequeueResolvers.isEmpty) {
        const resolver = dequeueResolvers.dequeue()!;
        resolver.resolve(item);
      } else {
        try {
          _buffer.write(item);
          // deno-lint-ignore no-explicit-any
        } catch (e: any) {
          throw e.name === "BufferFullError" ? new QueueFullError() : e;
        }
      }
    },
    dequeue() {
      if (_state === 2) {
        return Promise.reject(new QueueClosedError());
      }

      if (!queue.isEmpty) {
        return Promise.resolve(_buffer.read()!);
      }

      if (_state === 0) {
        return new Promise<T>(enqueueResolver);
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
    [Symbol.dispose]() {
      if (_state === 2) {
        return;
      }

      _state = 2;
      _buffer.clear();

      for (const resolver of dequeueResolvers.toBufferLike()) {
        resolver.reject(new QueueClosedError());
      }

      if (_onClose) {
        _onClose.resolve();
      }
    },
    [Symbol.asyncIterator]() {
      return {
        next: async () => {
          try {
            return { value: await queue.dequeue(), done: false };
          } catch (e) {
            if ((e instanceof QueueClosedError)) {
              return { value: undefined, done: true };
            }
            throw e;
          }
        },
      } as AsyncIterator<T>;
    },
  };

  return queue;
}
