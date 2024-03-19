import { type BufferStrategyOptions } from "../../buffer/BufferLike.ts";
import {
  QueueClosedError,
  QueueFullError,
  QueueReadOnlyError,
} from "./errors.ts";
import { Deferred } from "../Deferred.ts";
import { __getBufferFromOptions, __getQueueResolvers } from "./_utils.ts";

export type QueueOptions<T> = {
  bufferSize?: number;
  bufferStrategy?: BufferStrategyOptions<T>;
};

export type AsyncQueue<T> = Disposable & AsyncIterable<T> & {
  readonly state: "rw" | "r" | "-rw";
  readonly size: number;
  readonly isEmpty: boolean;
  readonly isClosed: boolean;

  enqueue(item: T): void;
  dequeue(): Promise<T>;

  setReadOnly(): void;
  close(): void;
  onClose(): Promise<void>;
};

export const AsyncQueue = function <T>(
  options: QueueOptions<T> = { bufferSize: Infinity },
): AsyncQueue<T> {
  return asyncQueue(options ?? { bufferSize: Infinity });
} as unknown as {
  new <T>(options?: QueueOptions<T>): AsyncQueue<T>;
};

type QueueState = "rw" | "r" | "-rw";

export function asyncQueue<T>(
  options: QueueOptions<T> = { bufferSize: Infinity },
): AsyncQueue<T> {
  const { dequeueResolvers, enqueueResolver } = __getQueueResolvers<T>();
  const _buffer = __getBufferFromOptions(options);
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
        } catch (e) {
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
