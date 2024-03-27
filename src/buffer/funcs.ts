import { Buffer } from "./Buffer.ts";
import {
  BufferLike,
  BufferStrategy,
  BufferStrategySelector,
} from "./BufferLike.ts";
import { RingBuffer } from "./RingBuffer.ts";

export function buffer<T>(
  capacity: number,
  strategy: BufferStrategy | BufferStrategySelector<T> = "fixed",
): BufferLike<T> {
  return new Buffer<T>(capacity, strategy);
}

export function ringBuffer<T>(
  capacity: number,
  strategy: BufferStrategy | BufferStrategySelector<T> = "fixed",
): BufferLike<T> {
  return new RingBuffer<T>(capacity, strategy);
}
