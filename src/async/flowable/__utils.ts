import { Pipeable } from "../pipeable/Pipeable.ts";
import {
  CancellationIterableOptions,
  type CancellationIterableOptionsExtended,
} from "../../cancellation/CancellationIterableOptions.ts";
import { cancellableIterable } from "../../cancellation/cancellableIterable.ts";
import { createObservable } from "../createObservable.ts";
import { Flowable } from "./Flowable.ts";
import type { FlowProcessor } from "./FlowProcessor.ts";
import * as p from "../pipeable/pipeable-funcs.ts";
import { fromIterableLike } from "../fromIterableLike.ts";
import type { IterableLike } from "../IterableLike.ts";
import type { FlowPublisher } from "./FlowPublisher.ts";
import { Maybe } from "../../Maybe.ts";

export function __createConnectable<T>(): FlowProcessor<T, T> {
  return __createConnectableWithParams();
}

export function __createFlowable<T>(
  generator: () => AsyncGenerator<T>,
): FlowPublisher<T> {
  const connectable = __createConnectable<T>();
  const flowable: FlowPublisher<T> = {
    filter: (predicate) => {
      connectable.filter(predicate);
      return flowable;
    },
    map: (mapper) => {
      connectable.map(mapper);
      // deno-lint-ignore no-explicit-any
      return flowable as FlowPublisher<any>;
    },
    compose: (mapper) => {
      connectable.compose(mapper);
      // deno-lint-ignore no-explicit-any
      return flowable as FlowPublisher<any>;
    },
    peek: (cb) => {
      connectable.peek(cb);
      return flowable;
    },
    skipUntil: (predicate) => {
      connectable.skipUntil(predicate);
      return flowable;
    },
    takeWhile: (predicate) => {
      connectable.takeWhile(predicate);
      return flowable;
    },
    resumeOnError: (onError) => {
      connectable.resumeOnError(onError);
      return flowable;
    },
    chunk: (size) => {
      connectable.chunk(size);
      // deno-lint-ignore no-explicit-any
      return flowable as FlowPublisher<any>;
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
      if (done) {
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
            for await (const item of fromIterableLike(input)) {
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
