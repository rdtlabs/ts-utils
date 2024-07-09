import { Buffer } from "./Buffer.ts";
import type {
  BufferLike,
  BufferStrategy,
  BufferStrategySelector,
} from "./BufferLike.ts";
import { RingBuffer } from "./RingBuffer.ts";

/**
 * Creates a buffer with the specified capacity and strategy.
 * @param capacity The maximum number of elements the buffer can hold.
 * @param strategy The strategy to use for handling buffer overflow. Defaults to "fixed".
 * @returns A new buffer instance.
 */
export function buffer<T>(
  capacity: number,
  strategy: BufferStrategy | BufferStrategySelector<T> = "fixed",
): BufferLike<T> {
  return new Buffer<T>(capacity, strategy);
}

/**
 * Creates a ring buffer with the specified capacity and strategy.
 *
 * @template T - The type of elements stored in the buffer.
 * @param capacity - The maximum number of elements the buffer can hold.
 * @param strategy - The strategy used to handle buffer overflow. Defaults to "fixed".
 * @returns A new instance of the ring buffer.
 */
export function ringBuffer<T>(
  capacity: number,
  strategy: BufferStrategy | BufferStrategySelector<T> = "fixed",
): BufferLike<T> {
  return new RingBuffer<T>(capacity, strategy);
}
