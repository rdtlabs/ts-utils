import type { BufferLike, BufferStrategy } from "./BufferLike.ts";
import DisposedError from "../common/DisposedError.ts";
import { BufferStrategySelector } from "./BufferLike.ts";
import { BufferFullError } from "./BufferFullError.ts";

export default class Buffer<T> implements BufferLike<T> {
  readonly #buffer: T[] = [];
  readonly #capacity: number;
  readonly #writeOnFull: (value: T) => void;
  #disposed = false;

  constructor(
    capacity = Infinity,
    strategy: BufferStrategy | BufferStrategySelector<T> = "fixed",
  ) {
    if (capacity < 1) {
      throw new Error("Buffer size must be at least 1");
    }

    this.#capacity = capacity;
    if (capacity === Infinity) {
      if (typeof strategy === "function") {
        throw new Error(
          "Buffer strategy selector cannot be used with infinite capacity",
        );
      }
      this.#writeOnFull = () => {
        throw new Error("Buffer is in an invalid state");
      };
      return;
    }

    switch (strategy) {
      case "drop":
        this.#writeOnFull = () => {};
        return;
      case "latest":
        this.#writeOnFull = (value: T) => {
          this.#buffer.splice(0, 1);
          this.#buffer.push(value);
        };
        break;
      case "fixed":
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
                this.#buffer.splice(0, 1);
                this.#buffer.push(value);
                return;
              case "fixed":
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

  get size(): number {
    return this.#buffer.length;
  }

  get isFull(): boolean {
    return this.#buffer.length >= this.#capacity;
  }

  get isEmpty(): boolean {
    return this.#buffer.length === 0;
  }

  write(value: T): void {
    if (this.#disposed) {
      throw new DisposedError();
    }

    if (this.#buffer.length < this.#capacity) {
      this.#buffer.push(value);
    } else {
      this.#writeOnFull(value);
    }
  }

  read(): T | undefined {
    return this.#buffer.shift();
  }

  peek(): T | undefined {
    return this.#buffer[0];
  }

  clear(): void {
    this.#buffer.splice(0);
  }

  [Symbol.dispose](): void {
    if (!this.#disposed) {
      this.#disposed = true;
      this.clear();
    }
  }

  *[Symbol.iterator](): Iterator<T> {
    if (this.#disposed) {
      throw new DisposedError();
    }

    while (!this.isEmpty) {
      yield this.read()!;
    }
  }
}
