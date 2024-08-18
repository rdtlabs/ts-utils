import type { BufferStrategyOptions } from "../../buffer/BufferLike.ts";
import type { ErrorLike, MaybeResult } from "../../types.ts";
import { asyncQueue } from "./asyncQueue.ts";
import type { CancellationToken } from "../../cancellation/CancellationToken.ts";

/**
 *  The options to use when creating a new async queue
 */
export type QueueOptions<T> = {
  /** The maximum number of items that can be enqueued before the buffer strategy is applied. */
  bufferSize?: number;

  /**
   * The buffer strategy to apply when the buffer is full.
   * "drop": Drops the item being enqueued.
   * "latest": Drops the oldest and enqueues the new item.
   * "fixed": Throws an error when the buffer is full.
   */
  bufferStrategy?: BufferStrategyOptions<T>;
};

/** An async queue that allows for enqueuing and dequeuing items concurrently */
export interface AsyncQueue<T> extends Disposable, AsyncIterable<T> {
  /**
   * Indicates the current state of the queue with respect to its
   * read/write capabilities.
   *
   * "rw": The queue is in a read-write state,items can be enqueued/dequeued.
   * "r": The queue is in a read-only state, items can only be dequeued.
   * "-rw": The queue is in a state neither enqueuing/dequeuing is allowed.
   */
  get state(): "rw" | "r" | "-rw";

  /** The current number of items in the queue */
  get size(): number;

  /** Returns whether the queue is empty (true) or not (false) */
  get isEmpty(): boolean;

  /** Returns whether the queue has been closed (true) or is still open (false) */
  get isClosed(): boolean;

  /** Returns whether the queue is full (true) or not (false) */
  get isFull(): boolean;

  /**
   * Enqueues an item of type T to the queue.
   *
   * Errors will be thrown in one of the three following conditions:
   * 1. The queue is read-only
   * 2. The queue is closed.
   * 3. The max buffer size has been reached and the buffer strategy chosen is "fixed".
   * @param item The item to add to the queue.
   */
  enqueue(item: T): void;

  /**
   * Attempts to enqueue an item of type T to the queue. Returns true if the item was successfully enqueued, otherwise false.
   *
   * @param item The item to add to the queue.
   */
  tryEnqueue(item: T): boolean;

  /**
   * Asynchronously dequeues an item from the queue. If the queue is empty, it will return a promise that resolves when an item is added to the queue.
   */
  dequeue(cancellationToken?: CancellationToken): Promise<T>;

  /**
   * Event handler for when an item is enqueued/dequeued from the queue.
   * @param event The event to listen for.
   * @param listener The listener to remove.
   * @param once If true, the listener will only be called once.
   */
  on(
    event: "dequeue" | "enqueue",
    listener: (item: T) => void,
    once?: boolean,
  ): void;

  /**
   * Event handler for when an item is enqueued/dequeued from the queue.
   * @param event The event to listen for.
   * @param listener The listener to remove.
   */
  off(event: "dequeue" | "enqueue", listener: (item: T) => void): void;

  /**
   * Synchronously dequeues an item from the queue if the queue is not empty, otherwise it will return an object with the value undefined and ok set to false.
   */
  tryDequeue(): MaybeResult<T>;

  /**
   * Sets the queue to a read-only state, preventing any further enqueuing of items. Items can still be dequeued until the queue is empty.
   * NOTE: When the queue is empty, it will be automatically closed.
   */
  setReadOnly(): void;

  /** Closes the queue. */
  close(err?: ErrorLike): void;

  /** Returns a promise that resolves when the queue is closed. */
  onClose(propagateInjectedError?: boolean): Promise<void>;
}

/**
 * Creates a new async queue with the specified options.
 * @param options The options to use when creating the queue.
 * @returns A new async queue.
 */
export const AsyncQueue = function <T>(
  options: QueueOptions<T> = { bufferSize: Infinity },
): AsyncQueue<T> {
  return asyncQueue(options ?? { bufferSize: Infinity });
} as unknown as {
  new <T>(options?: QueueOptions<T>): AsyncQueue<T>;
};
