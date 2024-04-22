import { type CancellationToken } from "../../cancellation/CancellationToken.ts";
import { Pipeable } from "../pipeable/Pipeable.ts";
import { cancellableIterable } from "../../cancellation/cancellableIterable.ts";
import { createObservable } from "../createObservable.ts";
import { Flowable } from "./Flowable.ts";
import { type FlowProcessor } from "./FlowProcessor.ts";
import * as p from "../pipeable/pipeable-funcs.ts";
import { type IterableLike } from "../fromIterableLike.ts";
import { type FlowPublisher } from "./FlowPublisher.ts";

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
    buffer: (size) => {
      connectable.buffer(size);
      // deno-lint-ignore no-explicit-any
      return flowable as FlowPublisher<any>;
    },
    into: (connectable) => {
      return Flowable.of(
        connectable.toIterable(
          flowable.toIterable(),
        ),
      );
    },
    toIterable: (cancellationToken?) => {
      return connectable.toIterable(
        generator(),
        cancellationToken,
      );
    },
    toArray: (cancellationToken) => {
      return new Promise<T[]>((resolve, reject) => {
        const items: T[] = [];
        (async () => {
          try {
            const it = flowable.toIterable(cancellationToken);
            for await (const item of it) {
              items.push(item);
            }
            if (cancellationToken?.isCancelled === true) {
              reject(cancellationToken.reason);
            } else {
              resolve(items);
            }
          } catch (error) {
            reject(error);
          }
        })();
      });
    },
    forEach: (cb, cancellationToken) => {
      return new Promise<void>((resolve, reject) => {
        (async () => {
          try {
            const it = flowable.toIterable(cancellationToken);
            for await (const item of it) {
              cb(item as T);
            }
            if (cancellationToken?.isCancelled === true) {
              reject(cancellationToken.reason);
            } else {
              resolve();
            }
          } catch (error) {
            reject(error);
          }
        })();
      });
    },
    toObservable: () => {
      return createObservable<T>((subscriber) => {
        (async () => {
          try {
            for await (const item of flowable.toIterable()) {
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

  return flowable;
}

function __createConnectableWithParams<T>(
  // deno-lint-ignore no-explicit-any
  pipeables = new Array<Pipeable<any>>()
): FlowProcessor<T, T> {
  if (pipeables.length > 0) {
    pipeables = pipeables.slice(); //copy
  }

  const connectable: FlowProcessor<T, T> = {
    filter: (predicate) => {
      pipeables.push(p.filter(predicate));
      return __createConnectableWithParams(pipeables);
    },
    map: (mapper) => {
      pipeables.push(p.map(mapper));
      // deno-lint-ignore no-explicit-any
      return __createConnectableWithParams(pipeables) as FlowProcessor<any, any>;
    },
    compose: (mapper) => {
      pipeables.push(p.compose(mapper));
      // deno-lint-ignore no-explicit-any
      return __createConnectableWithParams(pipeables) as FlowProcessor<any, any>;
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
    buffer: (size) => {
      pipeables.push(p.buffer(size));
      // deno-lint-ignore no-explicit-any
      return __createConnectableWithParams(pipeables) as FlowProcessor<any, any>;
    },
    toIterable(
      input: IterableLike<T>,
      cancellationToken?: CancellationToken,
    ): AsyncIterable<T> {
      return cancellableIterable(
        Pipeable.toIterable(input, ...pipeables),
        cancellationToken
      );
    },
  };
  return connectable;
}