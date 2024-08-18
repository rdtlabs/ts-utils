export type IterableLike<T> =
  | readonly T[]
  | readonly PromiseLike<T>[]
  | AsyncGenerator<T>
  | AsyncIterable<T>
  | Iterable<T>
  | Iterable<PromiseLike<T>>
  | PromiseLike<readonly T[]>
  | PromiseLike<readonly PromiseLike<T>[]>
  | PromiseLike<AsyncIterable<T>>
  | PromiseLike<Iterable<T>>
  | PromiseLike<Iterable<PromiseLike<T>>>;
