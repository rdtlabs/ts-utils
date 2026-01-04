import type { BufferLike } from "./buffer/BufferLike.ts";

/**
 * A queue that can be used to store items in a first-in-first-out order.
 */
export interface Queue<T> {
  readonly size: number;
  readonly isEmpty: boolean;

  /** Adds an item to the end of the queue. */
  enqueue(item: T): void;

  /** Removes and returns the item at the front of the queue. */
  dequeue(): T | undefined;

  /** Returns the item at the front of the queue if exists else undefined is returned. */
  peek(): T | undefined;

  /** Removes and returns the item at the front of the queue. */
  clear(): void;

  /** Returns a buffer wrapper around the queue */
  toBufferLike(): BufferLike<T>;
  toArray(): T[];
}

/** Creates a new queue. */
export function createQueue<T>(): Queue<T> {
  return new QueueImpl<T>();
}

/** Creates a new queue. */
export const Queue = function <T>(): {
  new <T>(): Queue<T>;
} {
  // deno-lint-ignore no-explicit-any
  return createQueue<T>() as any;
} as unknown as {
  new <T>(): Queue<T>;
};

class QueueImpl<T> {
  #head: Node<T> | undefined;
  #tail: Node<T> | undefined;
  #size = 0;

  get size(): number {
    return this.#size;
  }

  get isEmpty(): boolean {
    return this.#size === 0;
  }

  clear(): void {
    this.#head = undefined;
    this.#tail = undefined;
    this.#size = 0;
  }

  enqueue(value: T): void {
    const node = { value } as Node<T>;
    if (this.#tail) {
      this.#tail.next = node;
    }
    this.#tail = node;
    if (!this.#head) {
      this.#head = node;
    }
    this.#size++;
  }

  tryDequeue(): T | undefined {
    if (!this.#head) {
      return undefined;
    }

    const value = this.#head.value;
    this.#head = this.#head.next;
    this.#size--;

    return value;
  }

  dequeue(): T {
    if (!this.#head) {
      throw new Error("Queue is empty");
    }

    const value = this.#head.value;
    this.#head = this.#head.next;
    this.#size--;

    return value;
  }

  peek(): T | undefined {
    return this.#head?.value;
  }

  toBufferLike(): BufferLike<T> {
    // deno-lint-ignore no-this-alias
    const self = this;
    return {
      write: this.enqueue.bind(this),
      read: this.tryDequeue.bind(this),
      peek: this.peek.bind(this),
      get isEmpty(): boolean {
        return self.isEmpty;
      },
      get isFull(): boolean {
        return false;
      },
      get size(): number {
        return self.size;
      },
      clear: this.clear.bind(this),
      [Symbol.dispose]: (): void => {
        self.clear();
      },
      // deno-lint-ignore explicit-function-return-type
      *[Symbol.iterator]() {
        while (!self.isEmpty) {
          yield self.dequeue();
        }
      },
    };
  }

  toArray(): T[] {
    const array: T[] = [];
    while (!this.isEmpty) {
      array.push(this.dequeue());
    }

    return array;
  }
}

type Node<T> = {
  value: T;
  next?: Node<T>;
};
