import type { BufferLike } from "./buffer/BufferLike.ts";

/**
 * A queue that can be used to store items in a first-in-first-out order.
 */
export interface Queue<T> {
  readonly size: number;
  readonly isEmpty: boolean;

  /** Adds an item to the end of the queue. */
  enqueue(item: T): void;

  /** Removes and returns the item at the front of the queue, or undefined if empty. */
  dequeue(): T | undefined;

  /** Returns the item at the front of the queue without removing it, or undefined if empty. */
  peek(): T | undefined;

  /** Removes all items from the queue. */
  clear(): void;

  /** Returns a buffer wrapper around the queue. */
  toBufferLike(): BufferLike<T>;

  /** Converts the queue to an array and clears it. */
  toArray(): T[];
}

/** Creates a new queue. */
export function createQueue<T>(): Queue<T> {
  return new QueueImpl<T>();
}

/** Creates a new queue. */
export const Queue = function <T>() {
  // deno-lint-ignore no-explicit-any
  return createQueue<T>() as any;
} as unknown as {
  new <T>(): Queue<T>;
};

/** Queue constructor that creates a new queue instance. */
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
    if (value === undefined) {
      throw new TypeError("Cannot enqueue undefined value");
    }

    const node: Node<T> = { value };
    if (this.#tail) {
      this.#tail.next = node;
    }
    this.#tail = node;
    if (!this.#head) {
      this.#head = node;
    }
    this.#size++;
  }

  dequeue(): T | undefined {
    if (!this.#head) {
      return undefined;
    }
    const value = this.#head.value;
    this.#head = this.#head.next;
    if (!this.#head) {
      this.#tail = undefined;
    }
    this.#size--;
    return value;
  }

  peek(): T | undefined {
    return this.#head?.value;
  }

  toBufferLike(): BufferLike<T> {
    const enqueue = this.enqueue.bind(this);
    const dequeue = this.dequeue.bind(this);
    const peek = this.peek.bind(this);
    const clear = this.clear.bind(this);
    const getIsEmpty = () => this.isEmpty;
    const getSize = () => this.size;

    return Object.freeze({
      write: enqueue,
      read: dequeue,
      peek,
      get isEmpty(): boolean {
        return getIsEmpty();
      },
      get isFull(): boolean {
        return false;
      },
      get size(): number {
        return getSize();
      },
      clear,
      [Symbol.dispose]: clear,
      *[Symbol.iterator]() {
        let item = dequeue();
        while (item !== undefined) {
          yield item;
          item = dequeue();
        }
      },
    } as BufferLike<T>);
  }

  toArray(): T[] {
    const array: T[] = [];
    let item = this.dequeue();
    while (item !== undefined) {
      array.push(item);
      item = this.dequeue();
    }
    return array;
  }
}

type Node<T> = {
  value: T;
  next?: Node<T>;
};
