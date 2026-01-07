import type { BufferStrategyOptions } from "../../buffer/BufferLike.ts";
import type { CancellationToken } from "../../cancellation/CancellationToken.ts";
import type { Observable } from "../_rx.types.ts";
import { type EventOptions, fromEvent } from "../fromEvent.ts";
import type { IterableLike } from "../IterableLike.ts";
import { fromIterableLike } from "../fromIterableLike.ts";
import { fromObservable } from "../fromObservable.ts";
import type { FlowProcessor } from "./FlowProcessor.ts";
import type { FlowPublisher } from "./FlowPublisher.ts";
import { __createConnectable, __createFlowable } from "./__utils.ts";

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
      yield it;
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
    const copy = sources.slice();
    return __createFlowable<T>(async function* inner() {
      for (const item of copy) {
        yield* item.toIterable();
      }
    });
  },
  fromGenerator<T>(generator: () => AsyncGenerator<T>): FlowPublisher<T> {
    return __createFlowable(generator);
  },
  fromObservable: <T>(o: Observable<T>, p: FromOptions<T>) => {
    return Flowable.of(fromObservable<T>(o, p));
  },
  fromEvent<T extends Event>(
    // deno-lint-ignore no-explicit-any
    ...args: any[]
  ): FlowPublisher<T> {
    return Flowable.of(fromEvent(args[0], args[1]));
  },
}) as Flowable;
