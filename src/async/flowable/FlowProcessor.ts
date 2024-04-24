import { type CancellationOptions } from "../../cancellation/CancellationOptions.ts";
import { type ErrorLike } from "../../types.ts";
import { Observable } from "../_rx.types.ts";
import { type IterableLike } from "../fromIterableLike.ts";
import { CancellationError } from "../../cancellation/CancellationError.ts";
import { type CancellationToken } from "../../cancellation/CancellationToken.ts";
import { type Maybe } from "../../Maybe.ts";

export interface FlowProcessor<S, T> {
  filter(
    predicate: (t: T) => Promise<boolean> | boolean,
  ): FlowProcessor<S, T>;

  map<R>(
    mapper: (t: T, index: number) => Promise<R> | R,
  ): FlowProcessor<S, R>;

  compose<R>(
    mapper: (t: T, index: number) => AsyncGenerator<R>,
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

  toIterable(
    input: IterableLike<S>,
    cancellationToken?: CancellationToken,
  ): AsyncGenerator<T>;

  toIterable(
    input: IterableLike<S>,
    onCancel: (error: CancellationError) => void,
  ): AsyncGenerator<T>;

  toIterable(
    input: IterableLike<S>,
    throwOnCancellation: boolean,
  ): AsyncGenerator<T>;

  toIterable(
    input: IterableLike<S>,
    options?: CancellationOptions,
  ): AsyncGenerator<T>;

  toArray(
    input: IterableLike<S>,
    cancellationToken?: CancellationToken,
  ): Promise<T[]>;

  toArray(
    input: IterableLike<S>,
    onCancel: (error: CancellationError) => void,
  ): Promise<T[]>;

  toArray(
    input: IterableLike<S>,
    throwOnCancellation: boolean,
  ): Promise<T[]>;

  toArray(
    input: IterableLike<S>,
    options?: CancellationOptions,
  ): Promise<T[]>;

  forEach(
    input: IterableLike<S>,
    cb: (item: T) => void,
    cancellationToken?: CancellationToken,
  ): Promise<void>;

  forEach(
    input: IterableLike<S>,
    cb: (item: T) => void,
    onCancel: (error: CancellationError) => void,
  ): Promise<void>;

  forEach(
    input: IterableLike<S>,
    cb: (item: T) => void,
    throwOnCancellation: boolean,
  ): Promise<void>;

  forEach(
    input: IterableLike<S>,
    cb: (item: T) => void,
    options?: CancellationOptions,
  ): Promise<void>;

  takeFirst(input: IterableLike<S>, cancellationToken?: CancellationToken): Promise<Maybe<T>>;
  takeFirst(input: IterableLike<S>, onCancel: (error: CancellationError) => void): Promise<Maybe<T>>;
  takeFirst(input: IterableLike<S>, throwOnCancellation: boolean): Promise<Maybe<T>>;
  takeFirst(input: IterableLike<S>, options?: CancellationOptions): Promise<Maybe<T>>;

  takeLast(input: IterableLike<S>, cancellationToken?: CancellationToken): Promise<Maybe<T>>;
  takeLast(input: IterableLike<S>, onCancel: (error: CancellationError) => void): Promise<Maybe<T>>;
  takeLast(input: IterableLike<S>, throwOnCancellation: boolean): Promise<Maybe<T>>;
  takeLast(input: IterableLike<S>, options?: CancellationOptions): Promise<Maybe<T>>;
}
