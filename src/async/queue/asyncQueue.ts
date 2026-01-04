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
  const { dequeueResolvers, enqueueResolver } = __getQueueResolvers<T>();
  const _buffer = __getBufferFromOptions<T>(options);
  const _onEnqueue = new Array<{ cb: (item: T) => void; once: boolean }>();
  const _onDequeue = new Array<{ cb: (item: T) => void; once: boolean }>();
  let _onClose: Deferred<void> | undefined;
  let _state: 0 | 1 | 2 = 0;

  function _enqueueUnsafe(item: T): void {
    while (!dequeueResolvers.isEmpty) {
      const resolver = dequeueResolvers.dequeue()!;
      if (!resolver.getIsCancelled()) {
        return resolver.resolve(_notifyListeners(item, _onEnqueue));
      }
    }

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
    // reverse for loop to allow for splicing and act on last listener first semantic
    for (let i = listeners.length - 1; i >= 0; i--) {
      const listener = listeners[i];
      if (listener.once) {
        listeners.splice(i, 1);
      }
      queueMicrotask(() => listener.cb(item));
    }

    return item;
  }

  function _attachEvent(
    promise: Promise<T>,
    listeners: Array<{ cb: (item: T) => void; once: boolean }>,
  ) {
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
    _off(listeners, listener); // remove if the listeners is already attached
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
      if (_state === 0) {
        return "rw";
      }

      return _state === 1 ? "r" : "-rw";
    },
    close(err?: ErrorLike): void {
      if (_state === 2) {
        return;
      }

      _state = 2;
      if (err) {
        _onClose ??= new Deferred<void>();
        _onClose.reject(err);
      } else {
        _onClose?.resolve();
      }

      _buffer.clear();
      _onEnqueue.length = 0;
      _onDequeue.length = 0;

      for (const resolver of dequeueResolvers.toBufferLike()) {
        if (!resolver.getIsCancelled()) {
          err ??= new QueueClosedError();
          resolver.reject(err);
        }
      }
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
      if (_state === 2) {
        throw new QueueClosedError();
      }

      _state = 1;
      if (queue.isEmpty) {
        this.close();
      } else {
        _onEnqueue.length = 0;
      }
    },
    tryEnqueue(item: T): boolean {
      if (_state !== 0) {
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
      if (_state === 2) {
        throw new QueueClosedError();
      }

      if (_state === 1) {
        throw new QueueReadOnlyError();
      }

      _enqueueUnsafe(item);
    },
    dequeue(cancellationToken?: CancellationToken): Promise<T> {
      if (_state === 2) {
        return Promise.reject(new QueueClosedError());
      }

      if (cancellationToken?.isCancelled === true) {
        return Promises.reject(cancellationToken.reason);
      }

      if (!queue.isEmpty) {
        return _attachEvent(Promise.resolve(_buffer.read()!), _onDequeue);
      }

      if (_state === 0) {
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

      this.close();

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
        return {
          value: _notifyListeners(_buffer.read()!, _onDequeue),
          ok: true,
        };
      }

      if (_state === 1) {
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
      if (_state === 2) {
        throw new QueueClosedError();
      }

      if (event === "dequeue") {
        _on(_onDequeue, listener, once);
      } else if (_state !== 1) {
        _on(_onEnqueue, listener, once);
      }
    },
    off(event: "dequeue" | "enqueue", listener: (item: T) => void): void {
      if (_state === 2) {
        throw new QueueClosedError();
      }

      _off(event === "enqueue" ? _onEnqueue : _onDequeue, listener);
    },
  };

  return queue;
}
