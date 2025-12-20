import {
  QueueClosedError,
  QueueFullError,
  QueueReadOnlyError,
} from "./errors.ts";
import { Deferred } from "../Deferred.ts";
import { __getBufferFromOptions, __getQueueResolvers } from "./_utils.ts";
import type { AsyncQueue, QueueOptions } from "./types.ts";
import type { ErrorLike, MaybeResult } from "../../types.ts";
import type { CancellationToken } from "../../cancellation/CancellationToken.ts";
import { Promises } from "../Promises.ts";

type QueueState = "rw" | "r" | "-rw";

// Internal state constants for better readability
const STATE_READ_WRITE = 0;
const STATE_READ_ONLY = 1;
const STATE_CLOSED = 2;

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
  const _onEnqueue = new Array<{ cb: (item: T) => void; once: boolean }>();
  const _onDequeue = new Array<{ cb: (item: T) => void; once: boolean }>();
  let _onClose: Deferred<void> | undefined;
  let _state: typeof STATE_READ_WRITE | typeof STATE_READ_ONLY | typeof STATE_CLOSED = STATE_READ_WRITE;

  // Helper to check if a resolver has been cancelled
  function isResolverActive(resolver: { getIsCancelled: () => boolean }): boolean {
    return !resolver.getIsCancelled();
  }

  // Helper to resolve pending dequeuers with the given item
  function resolvePendingDequeuer(item: T): boolean {
    while (!dequeueResolvers.isEmpty) {
      const resolver = dequeueResolvers.dequeue()!;
      if (isResolverActive(resolver)) {
        resolver.resolve(_notifyListeners(item, _onEnqueue));
        return true;
      }
    }
    return false;
  }

  function _enqueueUnsafe(item: T): void {
    // If there are pending dequeuers waiting, resolve the first active one
    if (resolvePendingDequeuer(item)) {
      return;
    }

    // Otherwise, write to buffer and notify listeners
    try {
      _buffer.write(item);
      _notifyListeners(item, _onEnqueue);
      // deno-lint-ignore no-explicit-any
    } catch (e: any) {
      throw e.name === "BufferFullError" ? new QueueFullError() : e;
    }
  }

  function _notifyListeners(
    item: T,
    listeners: Array<{ cb: (item: T) => void; once: boolean }>,
  ): T {
    // Iterate backwards to safely remove one-time listeners while iterating
    for (let i = listeners.length - 1; i >= 0; i--) {
      const listener = listeners[i];
      if (listener.once) {
        listeners.splice(i, 1);
      }
      // Execute listener asynchronously to avoid blocking
      queueMicrotask(() => listener.cb(item));
    }

    return item;
  }

  function _attachEvent(
    promise: Promise<T>,
    listeners: Array<{ cb: (item: T) => void; once: boolean }>,
  ): Promise<T> {
    // Only attach event handlers if there are listeners
    if (listeners.length === 0) {
      return promise;
    }

    return promise.then((item) => _notifyListeners(item, listeners));
  }

  function _on(
    listeners: Array<{ cb: (item: T) => void; once: boolean }>,
    listener: (item: T) => void,
    once?: boolean,
  ): void {
    // Remove existing listener to prevent duplicates
    _off(listeners, listener);
    listeners.push({ cb: listener, once: !!once });
  }

  function _off(
    listeners: Array<{ cb: (item: T) => void; once: boolean }>,
    listener: (item: T) => void,
  ): void {
    const index = listeners.findIndex((l) => l.cb === listener);
    if (index !== -1) {
      listeners.splice(index, 1);
    }
  }

  // Helper to check if queue state allows reads
  function isReadable(): boolean {
    return _state !== STATE_CLOSED;
  }

  // Helper to check if queue state allows writes
  function isWritable(): boolean {
    return _state === STATE_READ_WRITE;
  }

  // Helper to get the external queue state representation
  function getQueueState(): QueueState {
    switch (_state) {
      case STATE_READ_WRITE:
        return "rw";
      case STATE_READ_ONLY:
        return "r";
      case STATE_CLOSED:
        return "-rw";
    }
  }

  const queue = {
    get isClosed(): boolean {
      return _state === STATE_CLOSED;
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
      return getQueueState();
    },
    close(err?: ErrorLike): void {
      if (_state === STATE_CLOSED) {
        return;
      }

      _state = STATE_CLOSED;

      // Handle onClose promise resolution/rejection
      if (err) {
        (_onClose ??= new Deferred<void>()).reject(err);
      } else {
        _onClose?.resolve();
      }

      // Clean up resources
      _buffer.clear();
      _onEnqueue.length = 0;
      _onDequeue.length = 0;

      // Reject all pending dequeuers
      const closeError = err ?? new QueueClosedError();
      for (const resolver of dequeueResolvers.toBufferLike()) {
        if (isResolverActive(resolver)) {
          resolver.reject(closeError);
        }
      }
    },
    async onClose(propagateInjectedError?: boolean): Promise<void> {
      // Initialize onClose promise if not already created
      if (!_onClose) {
        if (queue.isClosed) {
          return;
        }
        _onClose = new Deferred<void>();
      }

      // Propagate error if requested, otherwise swallow QueueClosedError
      if (propagateInjectedError === true) {
        return await _onClose.promise;
      }

      try {
        return await _onClose.promise;
      } catch (e) {
        if (!(e instanceof QueueClosedError)) {
          throw e;
        }
      }
    },
    setReadOnly(): void {
      if (_state === STATE_CLOSED) {
        throw new QueueClosedError();
      }

      _state = STATE_READ_ONLY;

      // Auto-close if queue is empty, otherwise clear enqueue listeners
      if (queue.isEmpty) {
        this.close();
      } else {
        _onEnqueue.length = 0;
      }
    },
    tryEnqueue(item: T): boolean {
      if (!isWritable()) {
        return false;
      }

      try {
        _enqueueUnsafe(item);
        return true;
      } catch (e) {
        if (e instanceof QueueFullError) {
          return false;
        }
        throw e;
      }
    },
    enqueue(item: T): void {
      if (_state === STATE_CLOSED) {
        throw new QueueClosedError();
      }

      if (_state === STATE_READ_ONLY) {
        throw new QueueReadOnlyError();
      }

      _enqueueUnsafe(item);
    },
    dequeue(cancellationToken?: CancellationToken): Promise<T> {
      if (_state === STATE_CLOSED) {
        return Promise.reject(new QueueClosedError());
      }

      if (cancellationToken?.isCancelled === true) {
        return Promises.reject(cancellationToken.reason);
      }

      // If buffer has items, return immediately
      if (!queue.isEmpty) {
        return _attachEvent(Promise.resolve(_buffer.read()!), _onDequeue);
      }

      // If writable, queue is open and we can wait for items
      if (isWritable()) {
        if (!cancellationToken || cancellationToken.state === "none") {
          return _attachEvent(new Promise<T>(enqueueResolver), _onDequeue);
        }

        return _attachEvent(
          new Promise<T>((resolve, reject) =>
            enqueueResolver(
              resolve,
              reject,
              () => cancellationToken.isCancelled,
            )
          ),
          _onDequeue,
        );
      }

      // Queue is read-only and empty, close and reject
      this.close();

      return Promise.reject(
        new QueueClosedError(
          "Queue is read-only and has been exhausted of its items",
        ),
      );
    },
    tryDequeue(): MaybeResult<T> {
      if (_state === STATE_CLOSED) {
        throw new QueueClosedError();
      }

      if (!queue.isEmpty) {
        return {
          value: _notifyListeners(_buffer.read()!, _onDequeue),
          ok: true,
        };
      }

      // If read-only and empty, close the queue
      if (_state === STATE_READ_ONLY) {
        this.close();
      }

      return { ok: false };
    },
    [Symbol.dispose](): void {
      queue.close();
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
    on(
      event: "dequeue" | "enqueue",
      listener: (item: T) => void,
      once?: boolean,
    ): void {
      if (_state === STATE_CLOSED) {
        throw new QueueClosedError();
      }

      if (event === "dequeue") {
        _on(_onDequeue, listener, once);
      } else if (isWritable()) {
        // Only allow enqueue listeners if queue is writable
        _on(_onEnqueue, listener, once);
      }
    },
    off(event: "dequeue" | "enqueue", listener: (item: T) => void): void {
      if (_state === STATE_CLOSED) {
        throw new QueueClosedError();
      }

      _off(event === "enqueue" ? _onEnqueue : _onDequeue, listener);
    },
  };

  return queue;
}
