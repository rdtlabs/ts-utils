export interface BufferLike<T> extends Disposable, Iterable<T> {
  write(value: T): void;
  read(): T | undefined;
  peek(): T | undefined;

  get isFull(): boolean;
  get isEmpty(): boolean;
  get size(): number;

  clear(): void;
}

export type BufferStrategySelector<T> = (value: T) => BufferStrategy;
export type BufferStrategy = "drop" | "latest" | "fixed";
export type BufferStrategyOptions<T = unknown> =
  | BufferStrategy
  | BufferStrategySelector<T>;
