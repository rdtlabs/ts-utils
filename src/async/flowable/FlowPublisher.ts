import { type Observable } from "../_rx.types.ts";
import { type ErrorLike } from "../../types.ts";
import { type FlowProcessor } from "./FlowProcessor.ts";
import { CancellablePromise } from "../../cancellation/CancellablePromise.ts";
import { type CancellationOptions } from "../../cancellation/cancellableIterable.ts";

export interface FlowPublisher<T> {
  filter(
    predicate: (t: T) => Promise<boolean> | boolean,
  ): FlowPublisher<T>;

  map<R>(
    mapper: (t: T, index: number) => Promise<R> | R,
  ): FlowPublisher<R>;

  compose<R>(
    mapper: (t: T, index: number) => AsyncIterable<R>,
  ): FlowPublisher<R>;

  peek(cb: (item: T) => void): FlowPublisher<T>;

  skipUntil(
    predicate: (t: T) => Promise<boolean> | boolean,
  ): FlowPublisher<T>;

  takeWhile(
    predicate: (t: T) => Promise<boolean> | boolean,
  ): FlowPublisher<T>;

  resumeOnError(
    onError?: (error: ErrorLike) => Promise<boolean> | boolean,
  ): FlowPublisher<T>;

  buffer(size: number): FlowPublisher<T[]>;

  into<R>(connectable: FlowProcessor<T, R>): FlowPublisher<R>;

  toObservable(): Observable<T>;

  toIterable(
    options?: CancellationOptions,
  ): AsyncIterable<T>;

  toArray(
    options?: CancellationOptions,
  ): CancellablePromise<T[]>;

  forEach(
    cb: (item: T) => void,
    options?: CancellationOptions,
  ): CancellablePromise<void>;
}
