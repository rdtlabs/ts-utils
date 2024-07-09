/**
 * Represents a buffer-like object that can store and retrieve values of type T.
 */
export interface BufferLike<T> extends Disposable, Iterable<T> {
  /**
   * Writes a value to the buffer.
   * @param value The value to write.
   */
  write(value: T): void;

  /**
   * Reads a value from the buffer.
   * @returns The value read from the buffer, or undefined if the buffer is empty.
   */
  read(): T | undefined;

  /**
   * Peeks at the next value in the buffer without removing it.
   * @returns The next value in the buffer, or undefined if the buffer is empty.
   */
  peek(): T | undefined;

  /**
   * Indicates whether the buffer is full.
   */
  get isFull(): boolean;

  /**
   * Indicates whether the buffer is empty.
   */
  get isEmpty(): boolean;

  /**
   * Gets the current size of the buffer.
   */
  get size(): number;

  /**
   * Clears the buffer, removing all values.
   */
  clear(): void;
}

/**
 * A function that selects the buffer strategy based on the value being written.
 */
export type BufferStrategySelector<T> = (value: T) => BufferStrategy;

/**
 * Represents a buffer strategy.
 */
export type BufferStrategy = "drop" | "latest" | "fixed";

/**
 * Represents the options for a buffer strategy.
 */
export type BufferStrategyOptions<T = unknown> =
  | BufferStrategy
  | BufferStrategySelector<T>;
