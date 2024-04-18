import { type CancellationToken } from "../../cancellation/CancellationToken.ts";
import { type Observable } from "../_rx.types.ts";
import { type ErrorLike } from "../../types.ts";
import { type FlowProcessor } from "./FlowProcessor.ts";

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

  onError(cb: (error: ErrorLike) => void): FlowPublisher<T>;
  onComplete(cb: () => void): FlowPublisher<T>;
  onTerminate(cb: () => void): FlowPublisher<T>;

  into<R>(connectable: FlowProcessor<T, R>): FlowPublisher<R>;

  toObservable(): Observable<T>;
  toIterable(cancellationToken?: CancellationToken): AsyncIterable<T>;
  toArray(cancellationToken?: CancellationToken): Promise<T[]>;
  forEach(
    cb: (item: T) => void,
    cancellationToken?: CancellationToken,
  ): Promise<void>;
}