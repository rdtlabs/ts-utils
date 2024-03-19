import type { BufferLike, BufferStrategy } from "./BufferLike.ts";
import DisposedError from "../common/DisposedError.ts";
import { BufferStrategySelector } from "./BufferLike.ts";
import { BufferFullError } from "./BufferFullError.ts";

export default class RingBuffer<T> implements BufferLike<T> {
  readonly #buffer: Array<T | undefined>;
  readonly #capacity: number;
  readonly #writeOnFull: (value: T) => void;

  #size: number;
  #head: number;
  #tail: number;

  constructor(
    capacity: number,
    strategy: BufferStrategy | BufferStrategySelector<T> = "error",
  ) {
    if (capacity < 1) {
      throw new Error("Buffer size must be at least 1");
    }

    if (capacity === Infinity || capacity > 1024) {
      throw new Error(
        "Buffer size must be finite and less than or equal to 1024",
      );
    }

    this.#capacity = capacity;
    this.#buffer = new Array<T | undefined>(capacity);
    this.#size = 0;
    this.#head = 0;
    this.#tail = 0;

    switch (strategy) {
      case "drop":
        this.#writeOnFull = () => {};
        return;
      case "latest":
        this.#writeOnFull = (value: T) => {
          this.read();
          this.write(value);
        };
        break;
      case "error":
        this.#writeOnFull = () => {
          throw new BufferFullError();
        };
        break;
      default:
        if (typeof strategy === "function") {
          this.#writeOnFull = (value: T) => {
            const selectedStrategy = strategy(value);
            switch (selectedStrategy) {
              case "drop":
                return;
              case "latest":
                this.read();
                this.write(value);
                return;
              case "error":
                throw new BufferFullError();
              default:
                throw new Error("Invalid strategy");
            }
          };
          break;
        } else {
          throw new Error("Invalid strategy");
        }
    }
  }

  write(item: T): void {
    if (this.isDisposed) {
      throw new DisposedError();
    }

    if (this.#size === this.#capacity) {
      return this.#writeOnFull(item);
    }

    this.#buffer[this.#tail] = item;
    this.#tail = (this.#tail + 1) % this.#capacity;
    this.#size++;
  }

  read(): T | undefined {
    if (this.#size === 0) {
      return undefined;
    }

    const item = this.#buffer[this.#head];
    this.#buffer[this.#head] = undefined;
    this.#head = (this.#head + 1) % this.#capacity;
    this.#size--;
    return item;
  }

  peek(): T | undefined {
    if (this.#size === 0) {
      return undefined;
    }
    return this.#buffer[this.#head];
  }

  get isEmpty(): boolean {
    return this.#size === 0;
  }

  get isFull(): boolean {
    return this.#size === this.#capacity;
  }

  get size(): number {
    return this.#size;
  }

  get capacity(): number {
    return this.#capacity;
  }

  clear(): void {
    this.#size = 0;
    this.#head = 0;
    this.#tail = 0;
    this.#buffer.fill(undefined);
  }

  private get isDisposed() {
    return this.#tail === -1;
  }

  [Symbol.dispose](): void {
    this.#size = 0;
    this.#head = -1;
    this.#tail = -1;
    this.#buffer.splice(0);
  }

  *[Symbol.iterator](): Iterator<T> {
    if (this.isDisposed) {
      throw new DisposedError();
    }

    while (!this.isEmpty) {
      yield this.read()!;
    }
  }
}
