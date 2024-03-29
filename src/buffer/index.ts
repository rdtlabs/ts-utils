/**
 * This module contains buffer for use with push/pull semantics. These buffers are used in async
 * utilities that allow adapting unbounded push to more of an imperative pull async iterators, such
 * as `fromEvent`, `fromObservable`, etc. The buffers are used to store events/values until they
 * are consumed. Rules for buffer usage are defined by the `BufferStrategy` enum and allow for
 * dropping, keeping the latest, throwing an error, keeping all values, or creating a custom
 * buffer strategy.
 * @module buffer
 */

export * from "./BufferLike.ts";
export { Buffer } from "./Buffer.ts";
export { RingBuffer } from "./RingBuffer.ts";
