import type { BufferStrategyOptions } from "../buffer/BufferLike.ts";
import Cancellable from "../cancellation/Cancellable.ts";
import type { CancellationToken } from "../cancellation/CancellationToken.ts";
import cancellationSignal from "../cancellation/cancellationSignal.ts";
import { globalSelf } from "../globalSelf.ts";
import fromObservable from "./fromObservable.ts";

export function fromCustomEvent<T>(type: string): AsyncIterable<T> & Disposable;
export function fromCustomEvent<T>(
  type: string,
  options: boolean | AddEventListenerOptions,
): AsyncIterable<T> & Disposable;
export function fromCustomEvent<T>(type: string, bufferOptions: {
  bufferStrategy?: BufferStrategyOptions<T>;
  bufferSize?: number;
  cancellationToken?: CancellationToken;
}): AsyncIterable<T> & Disposable;

export function fromCustomEvent<T>(
  type: string,
  options: boolean | AddEventListenerOptions,
  bufferOptions: {
    bufferStrategy?: BufferStrategyOptions<T>;
    bufferSize?: number;
    cancellationToken?: CancellationToken;
  },
): AsyncIterable<T> & Disposable;

// deno-lint-ignore no-explicit-any
export function fromCustomEvent<T>(...args: any[]): any {
  return __fromAnyEvent<T>(args);
}

export function fromEvent<K extends keyof WindowEventMap>(
  type: K,
): AsyncIterable<WindowEventMap[K]> & Disposable;
export function fromEvent<K extends keyof WindowEventMap>(
  type: K,
  options: boolean | AddEventListenerOptions,
): AsyncIterable<WindowEventMap[K]> & Disposable;

export function fromEvent<K extends keyof WindowEventMap>(
  type: K,
  bufferOptions: {
    bufferStrategy?: BufferStrategyOptions<WindowEventMap[K]>;
    bufferSize?: number;
    cancellationToken?: CancellationToken;
  },
): AsyncIterable<WindowEventMap[K]> & Disposable;

export function fromEvent<K extends keyof WindowEventMap>(
  type: K,
  options: boolean | AddEventListenerOptions,
  bufferOptions: {
    bufferStrategy?: BufferStrategyOptions<WindowEventMap[K]>;
    bufferSize?: number;
    cancellationToken?: CancellationToken;
  },
): AsyncIterable<WindowEventMap[K]> & Disposable;

// deno-lint-ignore no-explicit-any
export function fromEvent<T>(...args: any[]) {
  return __fromAnyEvent<T>(args);
}

// deno-lint-ignore no-explicit-any
export function __fromAnyEvent<T>(args: any[]) {
  if (args.length === 0) {
    throw new TypeError("Invalid arguments");
  }

  const arg0 = args[0];
  if (args.length === 1) {
    return __fromEvent(arg0);
  }

  const arg1 = args[1];
  if (args.length === 3) {
    return __fromEvent(arg0, arg1, args[2]);
  }

  if (typeof arg1 === "boolean") {
    return __fromEvent(arg0, arg1);
  }

  return arg1.bufferSize || arg1.bufferStrategy || arg1.cancellationToken
    ? __fromEvent(arg0, undefined, arg1)
    : __fromEvent(args[0], arg1);
}

export function __fromEvent<T>(
  type: string,
  options?: boolean | AddEventListenerOptions,
  bufferOptions?: {
    bufferStrategy?: BufferStrategyOptions<T>;
    bufferSize?: number;
    cancellationToken?: CancellationToken;
  },
) {
  if (!bufferOptions?.bufferSize && !bufferOptions?.bufferStrategy) {
    bufferOptions = {
      ...(bufferOptions ?? {}),
      bufferSize: 1,
      bufferStrategy: "latest",
    };
  }

  const signalCancellation = typeof options !== "boolean" && options?.signal
    ? cancellationSignal(options.signal)
    : Cancellable.None;

  bufferOptions = {
    ...bufferOptions,
    cancellationToken: Cancellable.combine(
      bufferOptions.cancellationToken ?? Cancellable.None,
      signalCancellation,
    ),
  };

  // deno-lint-ignore no-explicit-any
  const gb = globalSelf as any;
  return fromObservable({
    subscribe(subscriber: { next: (value: T) => void }) {
      // deno-lint-ignore no-explicit-any
      const next = ((options as any)?.once !== true
        ? (ev) =>
          subscriber.next(ev)
        : (ev) => {
          subscriber.next(ev);
          unregister();
        }) as (ev: T) => void;

      const unregister = () => gb.removeEventListener(type, next, options);

      gb.addEventListener(type, next, options);

      return unregister;
    },
  }, bufferOptions);
}
