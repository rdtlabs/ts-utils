import {
  QueueClosedError,
  QueueFullError,
  QueueReadOnlyError,
} from "./errors.ts";
import { Deferred } from "../Deferred.ts";
import type { AsyncQueue, QueueOptions } from "./types.ts";
import type { ErrorLike, MaybeResult } from "../../types.ts";
import type { CancellationToken } from "../../cancellation/CancellationToken.ts";
import { Schedulers } from "../scheduler.ts";

type QueueState = "rw" | "r" | "-rw";

const STATE_READ_WRITE = 0;
const STATE_READ_ONLY = 1;
const STATE_CLOSED = 2;

/**
 * asyncQueueStreams creates a new async queue backed by the Web Streams API
 * with the given {@linkcode QueueOptions options}.
 *
 * This is an alternate implementation of {@linkcode asyncQueue} that uses
 * a `ReadableStream` and its controller as the underlying buffer, delegating
 * queue management to the streams API.
 *
 * @example
 * ```typescript
 * const queue = asyncQueueStreams<number>({
 *   bufferSize: 2,
 *   bufferStrategy: "fixed",
 * });
 *
 * queue.enqueue(1);
 * queue.enqueue(2);
 * queue.enqueue(3); // throws QueueFullError
 * queue.setReadOnly();
 *
 * console.log(queue.tryDequeue()); // prints { value: 1, ok: true }
 * console.log(await queue.dequeue()); // prints 2 and closes the queue
 * ```
 *
 * @param options The buffer options used to create the queue.
 */
export function asyncQueueStreams<T>(
  options: QueueOptions<T> = { bufferSize: Infinity } as QueueOptions<T>,
): AsyncQueue<T> {
  const bufferSize = options?.bufferSize ?? Infinity;
  const bufferStrategy = options?.bufferStrategy ?? "fixed";
  const hasFiniteBuffer = bufferSize !== Infinity;

  if (!hasFiniteBuffer && options?.bufferStrategy) {
    throw new Error("Buffer strategy is not supported for infinite buffer");
  }

  // Internal tracking
  let _state = STATE_READ_WRITE;
  let _size = 0;
  let _onClose: Deferred<void> | undefined;

  // For "latest" strategy: count of items in the stream to skip on pull.
  // ReadableStream doesn't support removing items from its internal queue,
  // so we mark items for eviction and skip them when pulled.
  let _evictCount = 0;

  // ReadableStream controller captured from the constructor
  let _controller!: ReadableStreamDefaultController<T>;

  // A local buffer for items pulled from the stream but not yet dequeued
  // by the consumer. This enables synchronous tryDequeue().
  const _pulled: T[] = [];

  // Pending dequeue promises waiting for items
  const _awaiters: Deferred<T>[] = [];

  const _listeners = new Listeners<T>();

  // Create the ReadableStream; we capture its controller.
  const _readable = new ReadableStream<T>({
    start(controller) {
      _controller = controller;
    },
    pull() {
      // Pull is called by the stream when the reader requests data.
      // We don't need to do anything here because we push data via
      // controller.enqueue() when the user calls enqueue().
    },
    cancel() {
      // The reader was cancelled
      if (_state !== STATE_CLOSED) {
        queue.close();
      }
    },
  }, {
    // Use a counting strategy so the stream tracks queue size
    highWaterMark: hasFiniteBuffer ? bufferSize : Infinity,
    size: () => 1,
  });

  // Acquire a reader for pulling items off the readable side
  const _reader = _readable.getReader();

  // Continuously pull from the stream and route items to awaiters or _pulled
  _startPulling();

  function _startPulling(): void {
    _reader.read().then(
      ({ value, done }) => {
        if (done) {
          return;
        }

        // Skip evicted items (used by "latest" strategy)
        if (_evictCount > 0) {
          _evictCount--;
          _startPulling();
          return;
        }

        _size--;

        // If there are pending dequeue awaiters, resolve the first one
        while (_awaiters.length > 0) {
          const awaiter = _awaiters.shift()!;
          if (!awaiter.isDone) {
            _listeners.notifyDequeue(value as T);
            awaiter.resolve(value as T);
            _checkAutoClose();
            _startPulling();
            return;
          }
        }

        // Otherwise, buffer it locally for tryDequeue / sync dequeue path
        _pulled.push(value as T);
        _checkAutoClose();
        _startPulling();
      },
      () => {
        // Stream errored or closed — nothing to do
      },
    );
  }

  function _checkAutoClose(): void {
    if (_state === STATE_READ_ONLY && _size === 0 && _pulled.length === 0) {
      queue.close();
    }
  }

  function _throwIfClosed(): void {
    if (_state === STATE_CLOSED) {
      throw new QueueClosedError();
    }
  }

  function _throwIfReadOnly(): void {
    _throwIfClosed();
    if (_state === STATE_READ_ONLY) {
      throw new QueueReadOnlyError();
    }
  }

  function _enqueueUnsafe(item: T): void {
    // First, check if there are pending dequeue awaiters to directly resolve
    while (_awaiters.length > 0) {
      const awaiter = _awaiters.shift()!;
      if (!awaiter.isDone) {
        _listeners.notifyEnqueue(item);
        _listeners.notifyDequeue(item);
        awaiter.resolve(item);
        return;
      }
    }

    // Check buffer capacity for finite buffers
    if (hasFiniteBuffer && (_size + _pulled.length) >= bufferSize) {
      switch (bufferStrategy) {
        case "fixed":
          throw new QueueFullError();
        case "drop":
          // Silently drop the item
          _listeners.notifyEnqueue(item);
          return;
        case "latest": {
          if (_pulled.length > 0) {
            // Evict from the local pulled buffer (oldest available)
            _pulled.shift();
          } else {
            // Items are in the stream's internal queue. Mark one for
            // eviction — it will be skipped when pulled.
            _evictCount++;
            // Don't increment _size: the new item replaces the evicted one.
            _controller.enqueue(item);
            _listeners.notifyEnqueue(item);
            return;
          }
          break;
        }
      }
    }

    _size++;
    _controller.enqueue(item);
    _listeners.notifyEnqueue(item);
  }

  const queue: AsyncQueue<T> = {
    get isClosed(): boolean {
      return _state === STATE_CLOSED;
    },
    get size(): number {
      return _size + _pulled.length;
    },
    get isEmpty(): boolean {
      return _size === 0 && _pulled.length === 0;
    },
    get isFull(): boolean {
      if (!hasFiniteBuffer) return false;
      return (_size + _pulled.length) >= bufferSize;
    },
    get state(): QueueState {
      if (_state === STATE_READ_WRITE) return "rw";
      return _state === STATE_READ_ONLY ? "r" : "-rw";
    },
    close(err?: ErrorLike): void {
      if (_state === STATE_CLOSED) {
        return;
      }

      _state = STATE_CLOSED;

      if (err) {
        _onClose ??= new Deferred<void>();
        _onClose.reject(err);
      } else {
        _onClose?.resolve();
      }

      // Close the stream
      try {
        _controller.close();
      } catch {
        // Already closed
      }

      _pulled.length = 0;
      _size = 0;
      _evictCount = 0;
      _listeners.clear();

      // Reject all pending awaiters
      for (const awaiter of _awaiters) {
        if (!awaiter.isDone) {
          awaiter.reject(err ?? new QueueClosedError());
        }
      }
      _awaiters.length = 0;
    },
    async onClose(propagateInjectedError?: boolean): Promise<void> {
      if (!_onClose) {
        if (queue.isClosed) {
          return;
        }
        _onClose = new Deferred<void>();
      }

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
      _throwIfClosed();

      _state = STATE_READ_ONLY;

      if (_size === 0 && _pulled.length === 0) {
        this.close();
      } else {
        _listeners.clearEnqueueListeners();
      }
    },
    tryEnqueue(item: T): boolean {
      if (_state !== STATE_READ_WRITE) {
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
      _throwIfReadOnly();
      _enqueueUnsafe(item);
    },
    async dequeue(cancellationToken?: CancellationToken): Promise<T> {
      _throwIfClosed();

      if (cancellationToken?.isCancelled === true) {
        throw cancellationToken.reason;
      }

      // Check local pulled buffer first
      if (_pulled.length > 0) {
        const item = _pulled.shift()!;
        _checkAutoClose();
        return _listeners.notifyDequeue(item);
      }

      if (_state === STATE_READ_WRITE || (_state === STATE_READ_ONLY && _size > 0)) {
        const deferred = new Deferred<T>(cancellationToken);
        _awaiters.push(deferred);
        return deferred.promise;
      }

      this.close();

      throw new QueueClosedError(
        "Queue is read-only and has been exhausted of its items",
      );
    },
    tryDequeue(): MaybeResult<T> {
      if (_pulled.length > 0) {
        const item = _pulled.shift()!;
        _checkAutoClose();
        return {
          value: _listeners.notifyDequeue(item),
          ok: true,
        };
      }

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
            if (e instanceof QueueClosedError) {
              return { done: true } as IteratorResult<T>;
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
      _throwIfClosed();
      _listeners.on(event, listener, once);
    },
    off(event: "dequeue" | "enqueue", listener: (item: T) => void): void {
      _throwIfClosed();
      _listeners.off(event, listener);
    },
  };

  return queue;
}

// --- Listener infrastructure (reused from asyncQueue.ts pattern) ---

class Listeners<T> {
  readonly #onEnqueueListeners = new EventListeners<T>();
  readonly #onDequeueListeners = new EventListeners<T>();

  private _getEventListeners(event: "dequeue" | "enqueue"): EventListeners<T> {
    return event === "enqueue"
      ? this.#onEnqueueListeners
      : this.#onDequeueListeners;
  }

  on(
    event: "dequeue" | "enqueue",
    listener: (item: T) => void,
    once?: boolean,
  ): void {
    this._getEventListeners(event).add(listener, once);
  }

  off(event: "dequeue" | "enqueue", listener: (item: T) => void): void {
    this._getEventListeners(event).remove(listener);
  }

  notifyEnqueue(item: T): T {
    return this.#onEnqueueListeners.notify(item);
  }

  notifyDequeue(item: T): T {
    return this.#onDequeueListeners.notify(item);
  }

  clearEnqueueListeners(): void {
    this.#onEnqueueListeners.clear();
  }

  clear(): void {
    this.#onEnqueueListeners.clear();
    this.#onDequeueListeners.clear();
  }
}

class EventListeners<T> {
  readonly #listeners = new Array<{ cb: (item: T) => void; once: boolean }>();

  constructor() {
    this.notify = this.notify.bind(this);
  }

  get length(): number {
    return this.#listeners.length;
  }

  clear(): void {
    this.#listeners.length = 0;
  }

  add(listener: (item: T) => void, once?: boolean): void {
    this.remove(listener);
    this.#listeners.push({ cb: listener, once: !!once });
  }

  remove(listener: (item: T) => void): void {
    const index = this.#listeners.findIndex((l) => l.cb === listener);
    if (index !== -1) {
      this.#listeners.splice(index, 1);
    }
  }

  notify(item: T): T {
    for (let i = this.#listeners.length - 1; i >= 0; i--) {
      const listener = this.#listeners[i];
      if (listener.once) {
        this.#listeners.splice(i, 1);
      }
      Schedulers.microtask(() => listener.cb(item));
    }

    return item;
  }
}
