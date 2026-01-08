import {
  QueueClosedError,
  QueueFullError,
  QueueReadOnlyError,
} from "./errors.ts";
import { Deferred } from "../Deferred.ts";
import type { AsyncQueue, QueueOptions } from "./types.ts";
import type { ErrorLike, MaybeResult } from "../../types.ts";
import type { CancellationToken } from "../../cancellation/CancellationToken.ts";
import type { BufferLike } from "../../buffer/BufferLike.ts";
import { Buffer } from "../../buffer/Buffer.ts";
import { createQueue } from "../../Queue.ts";

type QueueState = "rw" | "r" | "-rw";

// Queue state constants for better readability
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
  options: QueueOptions<T> = { bufferSize: Infinity } as QueueOptions<T>,
): AsyncQueue<T> {
  const _dequeueAwaiters = new Awaiters<T>();

  const _buffer = _getBufferFromOptions<T>(options);
  const _listeners = new Listeners<T>();
  let _onClose: Deferred<void> | undefined;
  let _state = STATE_READ_WRITE;

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
    if (_dequeueAwaiters.notifyOne(item)) {
      _listeners.notifyEnqueue(item);
      return;
    }

    try {
      _buffer.write(item);
      _listeners.notifyEnqueue(item);
      // deno-lint-ignore no-explicit-any
    } catch (e: any) {
      throw e.name === "BufferFullError" ? new QueueFullError() : e;
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
      if (_state === STATE_READ_WRITE) {
        return "rw";
      }

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

      _buffer.clear();
      _listeners.clear();
      _dequeueAwaiters.close(err);
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
      if (queue.isEmpty) {
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

      if (!queue.isEmpty) {
        return _listeners.notifyDequeue(_buffer.read()!);
      }

      if (_state === STATE_READ_WRITE) {
        return await _dequeueAwaiters
          .create(cancellationToken)
          .then((item) => _listeners.notifyDequeue(item));
      }

      this.close();

      throw new QueueClosedError(
        "Queue is read-only and has been exhausted of its items",
      );
    },
    tryDequeue(): MaybeResult<T> {
      _throwIfClosed();

      if (!queue.isEmpty) {
        return {
          value: _listeners.notifyDequeue(_buffer.read()!),
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

function _getBufferFromOptions<T>(
  options: QueueOptions<T>,
): BufferLike<T> {
  const hasFiniteBufferSize = options?.bufferSize !== Infinity;

  if (hasFiniteBufferSize) {
    return new Buffer<T>(
      options.bufferSize,
      options.bufferStrategy ?? "fixed",
    );
  }

  if (!options?.bufferStrategy) {
    return createQueue<T>().toBufferLike();
  }

  throw new Error("Buffer strategy is not supported for infinite buffer");
}

class Awaiters<T> {
  readonly #queue = createQueue<Deferred<T>>();

  constructor() {
    this.create = this.create.bind(this);
  }

  get isEmpty(): boolean {
    return this.#queue.isEmpty;
  }

  create(
    cancellationToken?: CancellationToken,
  ): Promise<T> {
    const deferred = new Deferred<T>(cancellationToken);
    this.#queue.enqueue(deferred);
    return deferred.promise;
  }

  close(err?: ErrorLike): void {
    while (!this.#queue.isEmpty) {
      const awaiter = this.#queue.dequeue()!;
      if (!awaiter.isDone) {
        err ??= new QueueClosedError();
        awaiter.reject(err);
      }
    }
  }

  notifyOne(item: T): boolean {
    while (!this.#queue.isEmpty) {
      const awaiter = this.#queue.dequeue()!;
      if (!awaiter.isDone) {
        awaiter.resolve(item);
        return true;
      }
    }

    return false;
  }
}

class Listeners<T> {
  readonly #onEnqueueListeners = new EventListeners<T>();
  readonly #onDequeueListeners = new EventListeners<T>();

  private _getEventListeners(event: "dequeue" | "enqueue"): EventListeners<T> {
    return event === "enqueue" ? this.#onEnqueueListeners : this.#onDequeueListeners;
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
    this.remove(listener); // remove if the listeners is already attached
    this.#listeners.push({ cb: listener, once: !!once });
  }

  remove(listener: (item: T) => void): void {
    const index = this.#listeners.findIndex((l) => l.cb === listener);
    if (index !== -1) {
      this.#listeners.splice(index, 1);
    }
  }

  notify(item: T): T {
    // reverse for loop to allow for splicing and act on last listener first semantic
    for (let i = this.#listeners.length - 1; i >= 0; i--) {
      const listener = this.#listeners[i];
      if (listener.once) {
        this.#listeners.splice(i, 1);
      }
      queueMicrotask(() => listener.cb(item));
    }

    return item;
  }
}
