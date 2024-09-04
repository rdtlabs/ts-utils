import type { Observable } from "../_rx.types.ts";
import type { ErrorLike } from "../../types.ts";
import type { FlowProcessor } from "./FlowProcessor.ts";
import type { CancellationIterableOptions } from "../../cancellation/CancellationIterableOptions.ts";
import type { CancellationError } from "../../cancellation/CancellationError.ts";
import type { CancellationToken } from "../../cancellation/CancellationToken.ts";
import type { Maybe } from "../../Maybe.ts";

/**
 * Represents a flow publisher that applies various operations on a stream of
 * values.
 *
 * @template T The values emitted by the publisher
 */
export interface FlowPublisher<T> {
  /**
   * Filters the items emitted by the publisher based on a predicate.
   *
   * @param predicate - The predicate function used to filter the items.
   * @returns A new `FlowPublisher` that emits only the items that satisfy the
   * predicate.
   */
  filter(
    predicate: (t: T) => Promise<boolean> | boolean,
  ): FlowPublisher<T>;

  /**
   * Transforms the items emitted by the publisher using a mapper function.
   *
   * @param mapper - The mapper function used to transform the items.
   * @returns A new `FlowPublisher` that emits the transformed items.
   */
  map<R>(
    mapper: (t: T, index: number) => Promise<R> | R,
  ): FlowPublisher<R>;

  /**
   * Composes the items emitted by the publisher using an async generator.
   *
   * @param mapper - The async generator function used to compose the items.
   * @returns A new `FlowPublisher` that emits the composed items.
   */
  compose<R>(
    mapper: (t: T, index: number) => AsyncGenerator<R>,
  ): FlowPublisher<R>;

  /**
   * Executes a callback function for each item emitted by the publisher.
   *
   * @param cb - The callback function to execute for each item.
   * @returns The original `FlowPublisher`.
   */
  peek(cb: (item: T) => void): FlowPublisher<T>;

  /**
   * Skips items emitted by the publisher until a predicate is satisfied.
   *
   * @param predicate - The predicate function used to determine when to stop
   * skipping.
   * @returns A new `FlowPublisher` that emits the remaining items after the
   * predicate is satisfied.
   */
  skipUntil(
    predicate: (t: T) => Promise<boolean> | boolean,
  ): FlowPublisher<T>;

  /**
   * Takes items emitted by the publisher until a predicate is satisfied.
   *
   * @param predicate - The predicate function used to determine when to stop
   * taking items.
   * @returns A new `FlowPublisher` that emits only the items until the
   * predicate is satisfied.
   */
  takeWhile(
    predicate: (t: T) => Promise<boolean> | boolean,
  ): FlowPublisher<T>;

  /**
   * Resumes the flow of items emitted by the publisher after an error occurs.
   *
   * @param onError - The error handler function to determine whether to resume
   * or not.
   * @returns A new `FlowPublisher` that resumes emitting items after an error
   * occurs.
   */
  resumeOnError(
    onError?: (error: ErrorLike) => Promise<boolean> | boolean,
  ): FlowPublisher<T>;

  /**
   * Groups the items emitted by the publisher into chunks of a specified size.
   *
   * @param size - The size of each chunk.
   * @returns A new `FlowPublisher` that emits the items grouped into chunks.
   */
  chunk(size: number): FlowPublisher<T[]>;

  /**
   * Connects the publisher to a flow processor.
   *
   * @param connectable - The flow processor to connect to.
   * @returns A new `FlowPublisher` that emits the processed items.
   */
  pipe<R>(connectable: FlowProcessor<T, R>): FlowPublisher<R>;

  /**
   * Converts the publisher to an observable.
   *
   * @returns An observable that emits the items emitted by the publisher.
   */
  toObservable(): Observable<T>;

  /**
   * Converts the publisher to an async generator.
   *
   * @param cancellationToken - The cancellation token used to cancel the
   * iteration.
   * @returns An async generator that yields the items emitted by the
   * publisher.
   */
  toIterable(cancellationToken?: CancellationToken): AsyncGenerator<T>;

  /**
   * Converts the publisher to an async generator with a cancellation callback.
   *
   * @param onCancel - The cancellation callback function.
   * @returns An async generator that yields the items emitted by the
   * publisher.
   */
  toIterable(onCancel: (error: CancellationError) => void): AsyncGenerator<T>;

  /**
   * Converts the publisher to an async generator with cancellation options.
   *
   * @param throwOnCancellation - Whether to throw an error on cancellation.
   * @returns An async generator that yields the items emitted by the
   * publisher.
   */
  toIterable(throwOnCancellation: boolean): AsyncGenerator<T>;

  /**
   * Converts the publisher to an async generator with cancellation options.
   *
   * @param options - The cancellation options.
   * @returns An async generator that yields the items emitted by the
   * publisher.
   */
  toIterable(options?: CancellationIterableOptions): AsyncGenerator<T>;

  /**
   * Converts the publisher to an array.
   *
   * @param cancellationToken - The cancellation token used to cancel the
   * operation.
   * @returns A promise that resolves to an array of items emitted by the
   * publisher.
   */
  toArray(cancellationToken?: CancellationToken): Promise<T[]>;

  /**
   * Converts the publisher to an array with a cancellation callback.
   *
   * @param onCancel - The cancellation callback function.
   * @returns A promise that resolves to an array of items emitted by the
   * publisher.
   */
  toArray(onCancel: (error: CancellationError) => void): Promise<T[]>;

  /**
   * Converts the publisher to an array with cancellation options.
   *
   * @param throwOnCancellation - Whether to throw an error on cancellation.
   * @returns A promise that resolves to an array of items emitted by the
   * publisher.
   */
  toArray(throwOnCancellation: boolean): Promise<T[]>;

  /**
   * Converts the publisher to an array with cancellation options.
   *
   * @param options - The cancellation options.
   * @returns A promise that resolves to an array of items emitted by the
   * publisher.
   */
  toArray(options?: CancellationIterableOptions): Promise<T[]>;

  /**
   * Executes a callback function for each item emitted by the publisher.
   *
   * @param cb - The callback function to execute for each item.
   * @param cancellationToken - The cancellation token used to cancel the
   * operation.
   * @returns A promise that resolves when all items have been processed.
   */
  forEach(
    cb: (item: T) => void,
    cancellationToken?: CancellationToken,
  ): Promise<void>;

  /**
   * Executes a callback function for each item emitted by the publisher.
   *
   * @param cb - The callback function to execute for each item.
   * @param onCancel - The cancellation callback function.
   * @returns A promise that resolves when all items have been processed.
   */
  forEach(
    cb: (item: T) => void,
    onCancel: (error: CancellationError) => void,
  ): Promise<void>;

  /**
   * Executes a callback function for each item emitted by the publisher.
   *
   * @param cb - The callback function to execute for each item.
   * @param throwOnCancellation - Whether to throw an error on cancellation.
   * @returns A promise that resolves when all items have been processed.
   */
  forEach(
    cb: (item: T) => void,
    throwOnCancellation: boolean,
  ): Promise<void>;

  /**
   * Executes a callback function for each item emitted by the publisher.
   *
   * @param cb - The callback function to execute for each item.
   * @param options - The cancellation options.
   * @returns A promise that resolves when all items have been processed.
   */
  forEach(
    cb: (item: T) => void,
    options?: CancellationIterableOptions,
  ): Promise<void>;

  /**
   * Selects the first item emitted by the publisher.
   *
   * @param cancellationToken - The cancellation token used to cancel the
   * operation.
   * @returns A promise that resolves to the first item emitted by the
   * publisher, or `null` if no items are emitted.
   */
  selectFirst(cancellationToken?: CancellationToken): Promise<Maybe<T>>;

  /**
   * Selects the first item emitted by the publisher with a cancellation
   * callback.
   *
   * @param onCancel - The cancellation callback function.
   * @returns A promise that resolves to the first item emitted by the
   * publisher, or `null` if no items are emitted.
   */
  selectFirst(onCancel: (error: CancellationError) => void): Promise<Maybe<T>>;

  /**
   * Selects the first item emitted by the publisher with cancellation options.
   *
   * @param throwOnCancellation - Whether to throw an error on cancellation.
   * @returns A promise that resolves to the first item emitted by the
   * publisher, or `null` if no items are emitted.
   */
  selectFirst(throwOnCancellation: boolean): Promise<Maybe<T>>;

  /**
   * Selects the first item emitted by the publisher with cancellation options.
   *
   * @param options - The cancellation options.
   * @returns A promise that resolves to the first item emitted by the
   * publisher, or `null` if no items are emitted.
   */
  selectFirst(options?: CancellationIterableOptions): Promise<Maybe<T>>;

  /**
   * Selects the last item emitted by the publisher.
   *
   * @param cancellationToken - The cancellation token used to cancel the
   * operation.
   * @returns A promise that resolves to the last item emitted by the
   * publisher, or `null` if no items are emitted.
   */
  selectLast(cancellationToken?: CancellationToken): Promise<Maybe<T>>;

  /**
   * Selects the last item emitted by the publisher with a cancellation
   * callback.
   *
   * @param onCancel - The cancellation callback function.
   * @returns A promise that resolves to the last item emitted by the
   * publisher, or `null` if no items are emitted.
   */
  selectLast(onCancel: (error: CancellationError) => void): Promise<Maybe<T>>;

  /**
   * Selects the last item emitted by the publisher with cancellation options.
   *
   * @param throwOnCancellation - Whether to throw an error on cancellation.
   * @returns A promise that resolves to the last item emitted by the
   * publisher, or `null` if no items are emitted.
   */
  selectLast(throwOnCancellation: boolean): Promise<Maybe<T>>;

  /**
   * Selects the last item emitted by the publisher with cancellation options.
   *
   * @param options - The cancellation options.
   * @returns A promise that resolves to the last item emitted by the
   * publisher, or `null` if no items are emitted.
   */
  selectLast(options?: CancellationIterableOptions): Promise<Maybe<T>>;
}
