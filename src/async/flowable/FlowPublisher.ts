import { type Observable } from "../_rx.types.ts";
import { type ErrorLike } from "../../types.ts";
import { type FlowProcessor } from "./FlowProcessor.ts";
import { type CancellationOptions } from "../../cancellation/CancellationOptions.ts";
import { CancellationError } from "../../cancellation/CancellationError.ts";
import { type CancellationToken } from "../../cancellation/CancellationToken.ts";
import { type Maybe } from "../../Maybe.ts";

export interface FlowPublisher<T> {
  filter(
    predicate: (t: T) => Promise<boolean> | boolean,
  ): FlowPublisher<T>;

  map<R>(
    mapper: (t: T, index: number) => Promise<R> | R,
  ): FlowPublisher<R>;

  compose<R>(
    mapper: (t: T, index: number) => AsyncGenerator<R>,
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

  pipe<R>(connectable: FlowProcessor<T, R>): FlowPublisher<R>;

  toObservable(): Observable<T>;

  toIterable(cancellationToken?: CancellationToken): AsyncGenerator<T>;
  toIterable(onCancel: (error: CancellationError) => void): AsyncGenerator<T>;
  toIterable(throwOnCancellation: boolean): AsyncGenerator<T>;
  toIterable(options?: CancellationOptions): AsyncGenerator<T>;

  toArray(cancellationToken?: CancellationToken): Promise<T[]>;
  toArray(onCancel: (error: CancellationError) => void): Promise<T[]>;
  toArray(throwOnCancellation: boolean): Promise<T[]>;
  toArray(options?: CancellationOptions): Promise<T[]>;

  forEach(
    cb: (item: T) => void,
    cancellationToken?: CancellationToken,
  ): Promise<void>;

  forEach(
    cb: (item: T) => void,
    onCancel: (error: CancellationError) => void,
  ): Promise<void>;

  forEach(
    cb: (item: T) => void,
    throwOnCancellation: boolean,
  ): Promise<void>;

  forEach(
    cb: (item: T) => void,
    options?: CancellationOptions,
  ): Promise<void>;

  takeFirst(cancellationToken?: CancellationToken): Promise<Maybe<T>>;
  takeFirst(onCancel: (error: CancellationError) => void): Promise<Maybe<T>>;
  takeFirst(throwOnCancellation: boolean): Promise<Maybe<T>>;
  takeFirst(options?: CancellationOptions): Promise<Maybe<T>>;

  takeLast(cancellationToken?: CancellationToken): Promise<Maybe<T>>;
  takeLast(onCancel: (error: CancellationError) => void): Promise<Maybe<T>>;
  takeLast(throwOnCancellation: boolean): Promise<Maybe<T>>;
  takeLast(options?: CancellationOptions): Promise<Maybe<T>>;
}
