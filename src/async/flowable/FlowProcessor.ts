import { type CancellationToken } from "../../cancellation/CancellationToken.ts";
import { type ErrorLike } from "../../types.ts";
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

  onError(cb: (error: ErrorLike) => void): FlowProcessor<S, T>;
  onComplete(cb: () => void): FlowProcessor<S, T>;
  onTerminate(cb: () => void): FlowProcessor<S, T>;

  toIterable(
    input: IterableLike<S>,
    cancellationToken?: CancellationToken,
  ): AsyncIterable<T>;
}
