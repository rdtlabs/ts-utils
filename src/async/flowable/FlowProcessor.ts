import { CancellablePromise } from "../../cancellation/CancellablePromise.ts";
import { type CancellationOptions } from "../../cancellation/cancellableIterable.ts";
import { type ErrorLike } from "../../types.ts";
import { Observable } from "../_rx.types.ts";
import { type IterableLike } from "../fromIterableLike.ts";

export interface FlowProcessor<S, T> {
  filter(
    predicate: (t: T) => Promise<boolean> | boolean,
  ): FlowProcessor<S, T>;

  map<R>(
    mapper: (t: T, index: number) => Promise<R> | R,
  ): FlowProcessor<S, R>;

  compose<R>(
    mapper: (t: T, index: number) => AsyncIterable<R>,
  ): FlowProcessor<S, R>;

  peek(cb: (item: T) => void): FlowProcessor<S, T>;

  skipUntil(
    predicate: (t: T) => Promise<boolean> | boolean,
  ): FlowProcessor<S, T>;

  takeWhile(
    predicate: (t: T) => Promise<boolean> | boolean,
  ): FlowProcessor<S, T>;

  resumeOnError(
    onError?: (error: ErrorLike) => Promise<boolean> | boolean,
  ): FlowProcessor<S, T>;

  buffer(size: number): FlowProcessor<S, T[]>;

  toObservable(input: IterableLike<S>): Observable<T>;

  toArray(
    input: IterableLike<S>,
    options?: CancellationOptions,
  ): CancellablePromise<T[]>;

  toIterable(
    input: IterableLike<S>,
    options?: CancellationOptions,
  ): AsyncIterable<T>;

  forEach(
    input: IterableLike<S>,
    cb: (item: T) => void,
    options?: CancellationOptions,
  ): CancellablePromise<void>;
}
