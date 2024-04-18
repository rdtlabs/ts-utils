import { type CancellationToken } from "../../cancellation/CancellationToken.ts";
import { type ErrorLike } from "../../types.ts";
import { Pipeable } from "../pipeable/Pipeable.ts";
import { cancellableIterable } from "../../cancellation/cancellableIterable.ts";
import { Deferred } from "../Deferred.ts";
import { createObservable } from "../createObservable.ts";
import { Flowable } from "./Flowable.ts";
import { type FlowProcessor } from "./FlowProcessor.ts";
import * as p from "../pipeable/pipeable-funcs.ts";
import { fromIterableLike, type IterableLike } from "../fromIterableLike.ts";
import { FlowPublisher } from "./FlowPublisher.ts";

export function __createConnectable<T>(): FlowProcessor<T, T> {
  const onErrorListeners: Array<(e: ErrorLike) => void> = [];
  const onCompleteListeners: Array<() => void> = [];
  const onTerminateListeners: Array<() => void> = [];

  // deno-lint-ignore no-explicit-any
  const pipeables = new Array<Pipeable<any>>();
  const connectable: FlowProcessor<T, T> = {
    filter: (predicate) => {
      pipeables.push(p.filter(predicate));
      return connectable;
    },
    map: (mapper) => {
      pipeables.push(p.map(mapper));
      // deno-lint-ignore no-explicit-any
      return connectable as FlowProcessor<any, any>;
    },
    compose: (mapper) => {
      pipeables.push(p.compose(mapper));
      // deno-lint-ignore no-explicit-any
      return connectable as FlowProcessor<any, any>;
    },
    peek: (cb) => {
      pipeables.push(p.peek(cb));
      return connectable;
    },
    skipUntil: (predicate) => {
      pipeables.push(p.skipUntil(predicate));
      return connectable;
    },
    takeWhile: (predicate) => {
      pipeables.push(p.takeWhile(predicate));
      return connectable;
    },
    resumeOnError: (onError) => {
      pipeables.push(p.resumeOnError(onError));
      return connectable;
    },
    buffer: (size) => {
      pipeables.push(p.buffer(size));
      // deno-lint-ignore no-explicit-any
      return connectable as FlowProcessor<any, any>;
    },
    onError: (cb) => {
      if (!cb || typeof cb !== "function") {
        throw new Error("Invalid error handler");
      }
      onErrorListeners.push(cb);
      return connectable;
    },
    onComplete: (cb) => {
      if (!cb || typeof cb !== "function") {
        throw new Error("Invalid completion handler");
      }
      onCompleteListeners.push(cb);
      return connectable;
    },
    onTerminate: (cb) => {
      if (!cb || typeof cb !== "function") {
        throw new Error("Invalid termination handler");
      }
      onTerminateListeners.push(cb);
      return connectable;
    },
    toIterable(
      input: IterableLike<T>,
      cancellationToken?: CancellationToken,
    ): AsyncIterable<T> {
      return __buildIterable(
        async function* generator() {
          yield* fromIterableLike(input);
        },
        pipeables,
        onErrorListeners,
        onCompleteListeners,
        onTerminateListeners,
        cancellationToken,
      );
    },
  };
  return connectable;
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
    onError: (cb) => {
      connectable.onError(cb);
      return flowable;
    },
    onComplete: (cb) => {
      connectable.onComplete(cb);
      return flowable;
    },
    onTerminate: (cb) => {
      connectable.onTerminate(cb);
      return flowable;
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

function __buildIterable<T>(
  generator: () => AsyncGenerator<T>, // deno-lint-ignore no-explicit-any
  pipeables: Array<Pipeable<any>>,
  onErrorListeners: Array<(e: ErrorLike) => void>,
  onCompleteListeners: Array<() => void>,
  onTerminateListeners: Array<() => void>,
  cancellationToken?: CancellationToken,
): AsyncIterable<T> {
  const errorListeners = onErrorListeners.slice();
  const completeListeners = onCompleteListeners.slice();
  const terminateListeners = onTerminateListeners.slice();
  const pipeFuncs = pipeables.slice();

  return cancellableIterable({
    async *[Symbol.asyncIterator](): AsyncIterator<T> {
      const deferred = new Deferred();
      try {
        errorListeners.forEach((cb) => deferred.promise.catch(cb));
        completeListeners.forEach((cb) => deferred.promise.then(cb));
        terminateListeners.forEach((cb) => deferred.promise.finally(cb));

        const it = Pipeable.toIterable(generator(), ...pipeFuncs);

        yield* it;
        deferred.resolve();
      } catch (error) {
        deferred.reject(error);
      }

      // awaiting here will ensure we do not get an
      // unhandled promise rejection error
      await deferred.promise;
    },
  }, cancellationToken);
}
