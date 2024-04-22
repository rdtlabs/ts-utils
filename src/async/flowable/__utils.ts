import { type CancellationToken } from "../../cancellation/CancellationToken.ts";
import { Pipeable } from "../pipeable/Pipeable.ts";
import {
  cancellableIterable,
  type CancellationOptions,
} from "../../cancellation/cancellableIterable.ts";
import { createObservable } from "../createObservable.ts";
import { Flowable } from "./Flowable.ts";
import { type FlowProcessor } from "./FlowProcessor.ts";
import * as p from "../pipeable/pipeable-funcs.ts";
import { fromIterableLike, type IterableLike } from "../fromIterableLike.ts";
import { type FlowPublisher } from "./FlowPublisher.ts";
import { CancellablePromise } from "../../cancellation/CancellablePromise.ts";
import { CancellableDeferred } from "../../cancellation/CancellableDeferred.ts";
import { CancellationError } from "../../cancellation/CancellationError.ts";
import { Cancellable } from "../../cancellation/Cancellable.ts";
import { objects } from "../../objects.ts";

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
    toIterable: (options?) => {
      return connectable.toIterable(generator(), options);
    },
    toArray: (options) => {
      return connectable.toArray(generator(), options);
    },
    forEach: (cb, options) => {
      return connectable.forEach(generator(), cb, options);
    },
    toObservable: () => {
      return connectable.toObservable(generator());
    },
  };

  return flowable;
}

function __createConnectableWithParams<T>(
  // deno-lint-ignore no-explicit-any
  pipeables = new Array<Pipeable<any>>(),
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
      return __createConnectableWithParams(pipeables) as FlowProcessor<
        // deno-lint-ignore no-explicit-any
        any,
        // deno-lint-ignore no-explicit-any
        any
      >;
    },
    compose: (mapper) => {
      pipeables.push(p.compose(mapper));
      return __createConnectableWithParams(pipeables) as FlowProcessor<
        // deno-lint-ignore no-explicit-any
        any,
        // deno-lint-ignore no-explicit-any
        any
      >;
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
      return __createConnectableWithParams(pipeables) as FlowProcessor<
        // deno-lint-ignore no-explicit-any
        any,
        // deno-lint-ignore no-explicit-any
        any
      >;
    },
    toIterable(
      input: IterableLike<T>,
      options?: CancellationOptions,
    ): AsyncIterable<T> {
      return cancellableIterable(
        Pipeable.toIterable(input, ...pipeables),
        options,
      );
    },
    toArray(
      input: IterableLike<T>,
      options?: CancellationOptions,
    ): CancellablePromise<T[]> {
      const tpl = getOptions(options);
      const controller = Cancellable.create();
      const token = tpl.token
        ? Cancellable.combine(controller.token, tpl.token)
        : controller.token;

      const it = this.toIterable(input, {
        token,
        onCancel: (r) => {
          deferred.promise.cancel(r);
          if (tpl.onCancel) {
            tpl.onCancel(r);
          }
        },
        throwOnCancellation: tpl.throwOnCancellation,
      });

      const deferred = new CancellableDeferred<T[]>(controller.cancel);

      (async () => {
        const items: T[] = [];
        try {
          for await (const item of it) {
            items.push(item);
          }
          if (token?.isCancelled === true) {
            deferred.promise.cancel(token.reason);
          } else {
            deferred.resolve(items);
          }
        } catch (error) {
          deferred.reject(error);
        }
      })();

      return deferred.promise;
    },
    forEach(
      input: IterableLike<T>,
      cb: (item: T) => void,
      options?: CancellationOptions,
    ): CancellablePromise<void> {
      const tpl = getOptions(options);
      const controller = Cancellable.create();
      const token = tpl.token
        ? Cancellable.combine(controller.token, tpl.token)
        : controller.token;

      const it = this.toIterable(input, {
        token,
        onCancel: (r) => {
          deferred.promise.cancel(r);
          if (tpl.onCancel) {
            tpl.onCancel(r);
          }
        },
        throwOnCancellation: tpl.throwOnCancellation,
      });

      const deferred = new CancellableDeferred<void>(controller.cancel);

      (async () => {
        try {
          for await (const item of it) {
            cb(item as T);
          }
          if (token?.isCancelled === true) {
            deferred.promise.cancel(token.reason);
          } else {
            deferred.resolve();
          }
        } catch (error) {
          deferred.reject(error);
        }
      })();

      return deferred.promise;
    },
    toObservable: (input: IterableLike<T>) => {
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

function getOptions(options?: CancellationOptions): {
  token?: CancellationToken;
  onCancel?: (error: CancellationError) => void;
  throwOnCancellation?: boolean;
} {
  if (objects.isNil(options)) {
    return { throwOnCancellation: true };
  }

  if (typeof options === "boolean") {
    return { throwOnCancellation: options === true };
  }

  if (typeof options === "function") {
    return { onCancel: options, throwOnCancellation: true };
  }

  if ("throwIfCancelled" in options) {
    return { token: options, throwOnCancellation: true };
  }

  return {
    token: options.token,
    onCancel: options.onCancel,
    throwOnCancellation: objects.isNil(options.throwOnCancellation)
      ? true
      : options.throwOnCancellation === true,
  };
}
