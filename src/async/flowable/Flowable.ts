import { type BufferStrategyOptions } from "../../buffer/BufferLike.ts";
import { type CancellationToken } from "../../cancellation/CancellationToken.ts";
import { type Observable } from "../_rx.types.ts";
import { type EventOptions, fromEvent } from "../fromEvent.ts";
import { fromIterableLike, type IterableLike } from "../fromIterableLike.ts";
import { fromObservable } from "../fromObservable.ts";
import { type FlowProcessor } from "./FlowProcessor.ts";
import { type FlowPublisher } from "./FlowPublisher.ts";
import { __createConnectable, __createFlowable } from "./__utils.ts";

export const Flowable = Object.freeze({
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

    return __createFlowable<T>(async function* () {
      for await (const item of fromIterableLike<T>(it)) {
        yield item;
      }
    });
  },
  fromEvent<T extends Event>(
    // deno-lint-ignore no-explicit-any
    ...args: any[]
  ): FlowPublisher<T> {
    return Flowable.of(fromEvent(args[0], args[1]));
  },
  fromGenerator: __createFlowable,
  from: <T>(o: Observable<T>, p: FromOptions<T>) => {
    return Flowable.of(fromObservable<T>(o, p));
  },
  concat<T>(...sources: FlowPublisher<T>[]): FlowPublisher<T> {
    const copy = sources.slice();
    return __createFlowable<T>(async function* inner() {
      for (const item of copy) {
        for await (const innerItem of item.toIterable()) {
          yield innerItem as T;
        }
      }
    });
  },
}) as {
  of<T>(): FlowProcessor<T, T>;
  of<T>(it: IterableLike<T>): FlowPublisher<T>;
  fromEvent<T extends Event>(
    type: string,
    options?: EventOptions<T>,
  ): FlowPublisher<T>;
  fromEvent<K extends keyof WindowEventMap>(
    type: K,
    options?: EventOptions<WindowEventMap[K]>,
  ): FlowPublisher<WindowEventMap[K]>;
  fromGenerator<T>(
    generator: () => AsyncGenerator<T>,
  ): FlowPublisher<T>;
  from<T>(
    observable: Observable<T>,
    options?: FromOptions<T>,
  ): FlowPublisher<T>;
  concat<T>(...sources: FlowPublisher<T>[]): FlowPublisher<T>;
};

type FromOptions<T> = {
  bufferStrategy?: BufferStrategyOptions<T>;
  bufferSize?: number;
  cancellationToken?: CancellationToken;
};
