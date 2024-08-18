import type { CancellationIterableOptions } from "../../cancellation/CancellationIterableOptions.ts";
import type { ErrorLike } from "../../types.ts";
import type { Observable } from "../_rx.types.ts";
import type { IterableLike } from "../IterableLike.ts";
import type { CancellationError } from "../../cancellation/CancellationError.ts";
import type { CancellationToken } from "../../cancellation/CancellationToken.ts";
import type { Maybe } from "../../Maybe.ts";

/**
 * Represents a flow processor that applies various operations on a stream of values.
 *
 * @template S The type of the input values.
 * @template T The type of the output values.
 */
export interface FlowProcessor<S, T> {
  /**
   * Filters the values in the stream based on the provided predicate.
   *
   * @param predicate A function that determines whether a value should be included in the stream.
   * @returns A new `FlowProcessor` that only includes values that satisfy the predicate.
   */
  filter(predicate: (t: T) => Promise<boolean> | boolean): FlowProcessor<S, T>;

  /**
   * Transforms each value in the stream using the provided mapper function.
   *
   * @param mapper A function that maps each value to a new value.
   * @returns A new `FlowProcessor` that includes the transformed values.
   */
  map<R>(mapper: (t: T, index: number) => Promise<R> | R): FlowProcessor<S, R>;

  /**
   * Composes the values in the stream using the provided mapper function.
   *
   * @param mapper A function that composes the values in the stream.
   * @returns A new `FlowProcessor` that includes the composed values.
   */
  compose<R>(
    mapper: (t: T, index: number) => AsyncGenerator<R>,
  ): FlowProcessor<S, R>;

  /**
   * Executes the provided callback function for each value in the stream without modifying the stream.
   *
   * @param cb A callback function that is called for each value in the stream.
   * @returns The same `FlowProcessor` instance.
   */
  peek(cb: (item: T) => void): FlowProcessor<S, T>;

  /**
   * Skips values from the input stream until the specified predicate returns true.
   *
   * @param predicate A function that determines whether to skip a value.
   * @returns A new `FlowProcessor` that skips values until the predicate returns true.
   */
  skipUntil(
    predicate: (t: T) => Promise<boolean> | boolean,
  ): FlowProcessor<S, T>;

  /**
   * Takes values from the input stream while the specified predicate returns true.
   *
   * @param predicate A function that determines whether to take a value.
   * @returns A new `FlowProcessor` that takes values while the predicate returns true.
   */
  takeWhile(
    predicate: (t: T) => Promise<boolean> | boolean,
  ): FlowProcessor<S, T>;

  /**
   * Resumes the flow processor after an error occurs.
   *
   * @param onError A function that handles the error and determines whether to resume.
   * @returns A new `FlowProcessor` that resumes after an error occurs.
   */
  resumeOnError(
    onError?: (error: ErrorLike) => Promise<boolean> | boolean,
  ): FlowProcessor<S, T>;

  /**
   * Groups values from the input stream into arrays of the specified size.
   *
   * @param size The size of each chunk.
   * @returns A new `FlowProcessor` that groups values into arrays of the specified size.
   */
  chunk(size: number): FlowProcessor<S, T[]>;

  /**
   * Converts the input stream to an observable.
   *
   * @param input The input values to convert.
   * @returns An observable that emits the transformed values.
   */
  toObservable(input: IterableLike<S>): Observable<T>;

  /**
   * Converts the input stream to an async iterable.
   *
   * @param input The input values to convert.
   * @param cancellationToken The cancellation token to use for cancellation.
   * @returns An async generator that yields the transformed values.
   */
  toIterable(
    input: IterableLike<S>,
    cancellationToken?: CancellationToken,
  ): AsyncGenerator<T>;

  /**
   * Converts the input stream to an async iterable.
   *
   * @param input The input values to convert.
   * @param onCancel A callback function to handle cancellation.
   * @returns An async generator that yields the transformed values.
   */
  toIterable(
    input: IterableLike<S>,
    onCancel: (error: CancellationError) => void,
  ): AsyncGenerator<T>;

  /**
   * Converts the input stream to an async iterable.
   *
   * @param input The input values to convert.
   * @param throwOnCancellation Specifies whether to throw an error on cancellation.
   * @returns An async generator that yields the transformed values.
   */
  toIterable(
    input: IterableLike<S>,
    throwOnCancellation: boolean,
  ): AsyncGenerator<T>;

  /**
   * Converts the input stream to an async iterable.
   *
   * @param input The input values to convert.
   * @param options The options for the cancellation behavior.
   * @returns An async generator that yields the transformed values.
   */
  toIterable(
    input: IterableLike<S>,
    options?: CancellationIterableOptions,
  ): AsyncGenerator<T>;

  /**
   * Converts the input iterable to an array of type T.
   *
   * @param input The input iterable to convert.
   * @param cancellationToken Optional cancellation token to cancel the operation.
   * @returns A promise that resolves to an array of type T.
   */
  toArray(
    input: IterableLike<S>,
    cancellationToken?: CancellationToken,
  ): Promise<T[]>;

  /**
   * Converts the input iterable to an array of type T.
   *
   * @param input The input iterable to convert.
   * @param onCancel Callback function to handle cancellation errors.
   * @returns A promise that resolves to an array of type T.
   */
  toArray(
    input: IterableLike<S>,
    onCancel: (error: CancellationError) => void,
  ): Promise<T[]>;

  /**
   * Converts the input iterable to an array of type T.
   *
   * @param input The input iterable to convert.
   * @param throwOnCancellation Specifies whether to throw an error on cancellation.
   * @returns A promise that resolves to an array of type T.
   */
  toArray(
    input: IterableLike<S>,
    throwOnCancellation: boolean,
  ): Promise<T[]>;

  /**
   * Converts the input iterable to an array of type T.
   *
   * @param input The input iterable to convert.
   * @param options The cancellation iterable options.
   * @returns A promise that resolves to an array of type T.
   */
  toArray(
    input: IterableLike<S>,
    options?: CancellationIterableOptions,
  ): Promise<T[]>;

  /**
   * Executes a callback function for each item in the input iterable.
   *
   * @param input The input iterable to iterate over.
   * @param cb The callback function to execute for each item.
   * @param cancellationToken Optional cancellation token to cancel the operation.
   * @returns A promise that resolves when the iteration is complete.
   */
  forEach(
    input: IterableLike<S>,
    cb: (item: T) => void,
    cancellationToken?: CancellationToken,
  ): Promise<void>;

  /**
   * Executes a callback function for each item in the input iterable.
   *
   * @param input The input iterable to iterate over.
   * @param cb The callback function to execute for each item.
   * @param onCancel Callback function to handle cancellation errors.
   * @returns A promise that resolves when the iteration is complete.
   */
  forEach(
    input: IterableLike<S>,
    cb: (item: T) => void,
    onCancel: (error: CancellationError) => void,
  ): Promise<void>;

  /**
   * Executes a callback function for each item in the input iterable.
   *
   * @param input The input iterable to iterate over.
   * @param cb The callback function to execute for each item.
   * @param throwOnCancellation Specifies whether to throw an error on cancellation.
   * @returns A promise that resolves when the iteration is complete.
   */
  forEach(
    input: IterableLike<S>,
    cb: (item: T) => void,
    throwOnCancellation: boolean,
  ): Promise<void>;

  /**
   * Executes a callback function for each item in the input iterable.
   *
   * @param input The input iterable to iterate over.
   * @param cb The callback function to execute for each item.
   * @param options The cancellation iterable options.
   * @returns A promise that resolves when the iteration is complete.
   */
  forEach(
    input: IterableLike<S>,
    cb: (item: T) => void,
    options?: CancellationIterableOptions,
  ): Promise<void>;

  /**
   * Selects the first item from the input.
   *
   * @param input The iterable-like input.
   * @param cancellationToken Optional cancellation token.
   * @returns A promise that resolves to the selected item, or `undefined` if no item is found.
   */
  selectFirst(
    input: IterableLike<S>,
    cancellationToken?: CancellationToken,
  ): Promise<Maybe<T>>;

  /**
   * Selects the first item from the input.
   *
   * @param input The iterable-like input.
   * @param onCancel A callback function to be called if the operation is cancelled.
   * @returns A promise that resolves to the selected item, or `undefined` if no item is found.
   */
  selectFirst(
    input: IterableLike<S>,
    onCancel: (error: CancellationError) => void,
  ): Promise<Maybe<T>>;

  /**
   * Selects the first item from the input.
   *
   * @param input The iterable-like input.
   * @param throwOnCancellation Specifies whether to throw a `CancellationError` if the operation is cancelled.
   * @returns A promise that resolves to the selected item, or `undefined` if no item is found.
   */
  selectFirst(
    input: IterableLike<S>,
    throwOnCancellation: boolean,
  ): Promise<Maybe<T>>;

  /**
   * Selects the first item from the input.
   *
   * @param input The iterable-like input.
   * @param options The options for cancellation.
   * @returns A promise that resolves to the selected item, or `undefined` if no item is found.
   */
  selectFirst(
    input: IterableLike<S>,
    options?: CancellationIterableOptions,
  ): Promise<Maybe<T>>;

  /**
   * Selects the last item from the input.
   *
   * @param input The iterable-like input.
   * @param cancellationToken Optional cancellation token.
   * @returns A promise that resolves to the selected item, or `undefined` if no item is found.
   */
  selectLast(
    input: IterableLike<S>,
    cancellationToken?: CancellationToken,
  ): Promise<Maybe<T>>;

  /**
   * Selects the last item from the input.
   *
   * @param input The iterable-like input.
   * @param onCancel A callback function to be called if the operation is cancelled.
   * @returns A promise that resolves to the selected item, or `undefined` if no item is found.
   */
  selectLast(
    input: IterableLike<S>,
    onCancel: (error: CancellationError) => void,
  ): Promise<Maybe<T>>;

  /**
   * Selects the last item from the input.
   *
   * @param input The iterable-like input.
   * @param throwOnCancellation Specifies whether to throw a `CancellationError` if the operation is cancelled.
   * @returns A promise that resolves to the selected item, or `undefined` if no item is found.
   */
  selectLast(
    input: IterableLike<S>,
    throwOnCancellation: boolean,
  ): Promise<Maybe<T>>;

  /**
   * Selects the last item from the input.
   *
   * @param input The iterable-like input.
   * @param options The options for cancellation.
   * @returns A promise that resolves to the selected item, or `undefined` if no item is found.
   */
  selectLast(
    input: IterableLike<S>,
    options?: CancellationIterableOptions,
  ): Promise<Maybe<T>>;
}
