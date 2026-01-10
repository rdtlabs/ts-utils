import type { BufferStrategyOptions } from "../../buffer/BufferLike.ts";
import type { CancellationToken } from "../../cancellation/CancellationToken.ts";
import type { Observable } from "../_rx.types.ts";
import { type EventOptions, fromEvent } from "../fromEvent.ts";
import type { IterableLike } from "../IterableLike.ts";
import { fromIterableLike } from "../fromIterableLike.ts";
import { fromObservable } from "../fromObservable.ts";
import type { FlowProcessor } from "./FlowProcessor.ts";
import type { FlowPublisher } from "./FlowPublisher.ts";
import { Pipeable } from "../pipeable/Pipeable.ts";
import {
  CancellationIterableOptions,
  type CancellationIterableOptionsExtended,
} from "../../cancellation/CancellationIterableOptions.ts";
import { cancellableIterable } from "../../cancellation/cancellableIterable.ts";
import { createObservable } from "../createObservable.ts";
import * as p from "../pipeable/pipeable-funcs.ts";
import { Maybe } from "../../Maybe.ts";

type FromOptions<T> = {
  bufferStrategy?: BufferStrategyOptions<T>;
  bufferSize?: number;
  cancellationToken?: CancellationToken;
};

/**
 * Utility object for creating flow publishers/processors.
 */
export type Flowable = {
  /**
   * Creates a flow publisher that emits a single value.
   * @param it The value to emit.
   * @returns A flow publisher that emits the provided value.
   */
  single<T>(it: T | PromiseLike<T>): FlowPublisher<T>;

  /**
   * Creates a flow processor that emits values from an iterable.
   * @returns A flow processor that emits values from an iterable.
   */
  of<T>(): FlowProcessor<T, T>;

  /**
   * Creates a flow publisher that emits values from an iterable.
   * @param it The iterable to emit values from.
   * @returns A flow publisher that emits values from the iterable.
   */
  of<T>(it: IterableLike<T>): FlowPublisher<T>;

  /**
   * Concatenates multiple flow publishers into a single flow publisher.
   * @param sources The flow publishers to concatenate.
   * @returns A flow publisher that emits values from all the provided flow publishers.
   */
  concat<T>(...sources: FlowPublisher<T>[]): FlowPublisher<T>;

  /**
   * Creates a flow publisher that emits values from an async generator.
   * @param generator The async generator function.
   * @returns A flow publisher that emits values from the async generator.
   */
  fromGenerator<T>(
    generator: () => AsyncGenerator<T>,
  ): FlowPublisher<T>;

  /**
   * Creates a flow publisher that emits values from an observable.
   * @param observable The observable to emit values from.
   * @param options Additional options for creating the flow publisher.
   * @returns A flow publisher that emits values from the observable.
   */
  fromObservable<T>(
    observable: Observable<T>,
    options?: FromOptions<T>,
  ): FlowPublisher<T>;

  /**
   * Creates a flow publisher that emits values from a DOM event.
   * @param type The type of the DOM event.
   * @param options Additional options for creating the flow publisher.
   * @returns A flow publisher that emits values from the DOM event.
   */
  fromEvent<T extends Event>(
    type: string,
    options?: EventOptions<T>,
  ): FlowPublisher<T>;

  /**
   * Creates a flow publisher that emits values from a window event.
   * @param type The type of the window event.
   * @param options Additional options for creating the flow publisher.
   * @returns A flow publisher that emits values from the window event.
   */
  fromEvent<K extends keyof WindowEventMap>(
    type: K,
    options?: EventOptions<WindowEventMap[K]>,
  ): FlowPublisher<WindowEventMap[K]>;
};

/**
 * Utility object for creating flow publishers/processors.
 */
export const Flowable = Object.freeze({
  single<T>(it: T | PromiseLike<T>) {
    return __createFlowable<T>(async function* inner() {
      yield await it;
    });
  },
  of<T>(
    // deno-lint-ignore no-explicit-any
    ...args: any[]
  ): unknown {
    if (args.length === 0) {
      return __createConnectable<T>();
    }

    if (args.length > 1) {
      throw new Error("Invalid number of arguments");
    }

    const it = args[0];
    if (!it || typeof it !== "object") {
      throw new Error("Invalid iterable like input type");
    }

    return __createFlowable<T>(() => fromIterableLike<T>(it));
  },
  concat<T>(...sources: FlowPublisher<T>[]): FlowPublisher<T> {
    return __createFlowable<T>(async function* inner() {
      for (const item of sources) {
        yield* item.toIterable();
      }
    });
  },
  fromGenerator<T>(generator: () => AsyncGenerator<T>): FlowPublisher<T> {
    return __createFlowable(generator);
  },
  fromObservable: <T>(o: Observable<T>, p?: FromOptions<T>) => {
    return Flowable.of(fromObservable<T>(o, p));
  },
  fromEvent<T extends Event>(
    // deno-lint-ignore no-explicit-any
    ...args: any[]
  ): FlowPublisher<T> {
    return Flowable.of(fromEvent(args[0], args[1]));
  },
}) as Flowable;

function __createConnectable<T>(): FlowProcessor<T, T> {
  return __createConnectableWithParams();
}

function __createFlowable<T>(
  generator: () => AsyncGenerator<T>,
  connectable?: FlowProcessor<T, T>,
): FlowPublisher<T> {
  connectable ??= __createConnectable<T>();
  const flowable: FlowPublisher<T> = {
    filter: (predicate) => {
      connectable.filter(predicate);
      return __createFlowable(generator, connectable);
    },
    map: (mapper) => {
      connectable.map(mapper);
      // deno-lint-ignore no-explicit-any
      return __createFlowable(generator, connectable) as FlowPublisher<any>;
    },
    compose: (mapper) => {
      connectable.compose(mapper);
      // deno-lint-ignore no-explicit-any
      return __createFlowable(generator, connectable) as FlowPublisher<any>;
    },
    peek: (cb) => {
      connectable.peek(cb);
      return __createFlowable(generator, connectable);
    },
    skipUntil: (predicate) => {
      connectable.skipUntil(predicate);
      return __createFlowable(generator, connectable);
    },
    takeWhile: (predicate) => {
      connectable.takeWhile(predicate);
      return __createFlowable(generator, connectable);
    },
    resumeOnError: (onError) => {
      connectable.resumeOnError(onError);
      return __createFlowable(generator, connectable);
    },
    chunk: (size) => {
      connectable.chunk(size);
      // deno-lint-ignore no-explicit-any
      return __createFlowable(generator, connectable) as FlowPublisher<any>;
    },
    pipe: (connectable) => {
      return Flowable.of(
        connectable.toIterable(
          flowable.toIterable(),
        ),
      );
    },
    toIterable: (options?) => {
      return connectable.toIterable(
        generator(),
        options as CancellationIterableOptions,
      );
    },
    toArray: (options) => {
      return connectable.toArray(
        generator(),
        options as CancellationIterableOptions,
      );
    },
    forEach: (cb, options) => {
      return connectable.forEach(
        generator(),
        cb,
        options as CancellationIterableOptions,
      );
    },
    toObservable: () => {
      return connectable.toObservable(generator());
    },
    selectFirst: (options) => {
      return connectable.selectFirst(
        generator(),
        options as CancellationIterableOptions,
      );
    },
    selectLast: (options) => {
      return connectable.selectLast(
        generator(),
        options as CancellationIterableOptions,
      );
    },
  };

  return flowable;
}

function __createConnectableWithParams<S, T = S>(
  // deno-lint-ignore no-explicit-any
  pipeables = new Array<Pipeable<any>>(),
): FlowProcessor<S, T> {
  if (pipeables.length > 0) {
    pipeables = pipeables.slice(); //copy
  }

  const connectable: FlowProcessor<S, T> = {
    filter: (predicate) => {
      pipeables.push(p.filter(predicate));
      return __createConnectableWithParams(pipeables);
    },
    map: <R>(mapper: (t: T, index: number) => Promise<R> | R) => {
      pipeables.push(p.map(mapper));
      return __createConnectableWithParams<S, R>(pipeables);
    },
    compose: <R>(mapper: (t: T, index: number) => AsyncGenerator<R>) => {
      pipeables.push(p.compose(mapper));
      return __createConnectableWithParams<S, R>(pipeables);
    },
    peek: (cb) => {
      pipeables.push(p.peek(cb));
      return __createConnectableWithParams(pipeables);
    },
    skipUntil: (predicate) => {
      pipeables.push(p.skipUntil(predicate));
      return __createConnectableWithParams(pipeables);
    },
    takeWhile: (predicate) => {
      pipeables.push(p.takeWhile(predicate));
      return __createConnectableWithParams(pipeables);
    },
    resumeOnError: (onError) => {
      pipeables.push(p.resumeOnError(onError));
      return __createConnectableWithParams(pipeables);
    },
    chunk: (size) => {
      pipeables.push(p.chunk(size));
      return __createConnectableWithParams(pipeables);
    },
    toIterable(input, options) {
      return __iter(input, pipeables, options);
    },
    async toArray(
      input: IterableLike<S>,
      options?: CancellationIterableOptionsExtended,
    ): Promise<T[]> {
      const items: T[] = [];
      for await (
        const item of __iter<S, T>(input, pipeables, options, {
          throwOnCancellation: true,
        })
      ) {
        items.push(item);
      }
      return items;
    },
    async forEach(input: IterableLike<S>, cb, options) {
      for await (
        const item of __iter(input, pipeables, options, {
          throwOnCancellation: true,
        })
      ) {
        cb(item as T);
      }
    },
    async selectFirst(input, options) {
      const gen = __iter(input, pipeables, options, {
        throwOnCancellation: true,
      });

      const { value, done } = await gen.next();
      if (!done) {
        await gen.return?.(undefined);
      }

      return Maybe.of(value as T);
    },
    async selectLast(input, options) {
      let lastItem: T | undefined;
      for await (
        const item of __iter(input, pipeables, options, {
          throwOnCancellation: true,
        })
      ) {
        lastItem = item as T;
      }
      return Maybe.of(lastItem);
    },
    toObservable: (input) => {
      return createObservable<T>((subscriber) => {
        (async () => {
          try {
            for await (const item of __iter(input, pipeables)) {
              if (subscriber.isCancelled) {
                return;
              }
              subscriber.next(item as T);
            }
            subscriber.complete();
          } catch (error) {
            subscriber.error(error);
          }
        })();
      });
    },
  };
  return connectable;
}

function __iter<S, T = S>(
  input: IterableLike<S>,
  pipeables: Array<Pipeable<unknown>>,
  options?: CancellationIterableOptionsExtended,
  defaults?: CancellationIterableOptions,
): AsyncGenerator<T> {
  return cancellableIterable(
    Pipeable.toIterable(input, ...pipeables),
    CancellationIterableOptions.from(options, defaults),
  );
}
