import { type CancellationToken } from "../../cancellation/CancellationToken.ts";
import { type ErrorLike } from "../../types.ts";
import { type IterableLike } from "../fromIterableLike.ts";

export interface Connectable<S, T> {
  filter(
    predicate: (t: T) => Promise<boolean> | boolean,
  ): Connectable<S, T>;

  map<R>(
    mapper: (t: T, index: number) => Promise<R> | R,
  ): Connectable<S, R>;

  compose<R>(
    mapper: (t: T, index: number) => AsyncIterable<R>,
  ): Connectable<S, R>;

  peek(cb: (item: T) => void): Connectable<S, T>;

  skipUntil(
    predicate: (t: T) => Promise<boolean> | boolean,
  ): Connectable<S, T>;

  takeWhile(
    predicate: (t: T) => Promise<boolean> | boolean,
  ): Connectable<S, T>;

  resumeOnError(
    onError?: (error: ErrorLike) => Promise<boolean> | boolean,
  ): Connectable<S, T>;

  buffer(size: number): Connectable<S, T[]>;

  onError(cb: (error: ErrorLike) => void): Connectable<S, T>;
  onComplete(cb: () => void): Connectable<S, T>;
  onTerminate(cb: () => void): Connectable<S, T>;

  toIterable(
    input: IterableLike<S>,
    cancellationToken?: CancellationToken,
  ): AsyncIterable<T>;
}
