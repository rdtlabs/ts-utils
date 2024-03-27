import type { BufferStrategyOptions } from "../buffer/BufferLike.ts";
import { Cancellable } from "../cancellation/Cancellable.ts";
import type { CancellationToken } from "../cancellation/CancellationToken.ts";
import { cancellationSignal } from "../cancellation/cancellationSignal.ts";
import { fromObservable } from "./fromObservable.ts";

type Options<T> =
  | boolean
  | (AddEventListenerOptions & {
    bufferStrategy?: BufferStrategyOptions<T>;
    bufferSize?: number;
    cancellationToken?: CancellationToken;
  });

export function fromEvent<T extends Event>(
  type: string,
  options?: Options<T>,
): AsyncIterable<T> & Disposable;

export function fromEvent<K extends keyof WindowEventMap>(
  type: K,
  options?: Options<WindowEventMap[K]>,
): AsyncIterable<WindowEventMap[K]> & Disposable;

// deno-lint-ignore no-explicit-any
export function fromEvent<T extends Event>(
  ...args: any[]
): AsyncIterable<T> & Disposable {
  const {
    type,
    options,
    bufferOptions,
  } = getArgs<T>(args);

  return fromObservable<T>({
    subscribe(subscriber: { next: (value: T) => void }): () => void {
      // deno-lint-ignore no-explicit-any
      const next = (options as any)?.once !== true
        // deno-lint-ignore no-explicit-any
        ? (ev: any) => subscriber.next(ev)
        // deno-lint-ignore no-explicit-any
        : (ev: any) => {
          subscriber.next(ev);
          unregister();
        };

      const unregister = () =>
        globalThis.removeEventListener(type, next, options);

      globalThis.addEventListener(type, next, options);

      return unregister;
    },
  }, bufferOptions);
}

const defaultBufferOptions = {
  bufferSize: 1,
  bufferStrategy: "latest",
} as BufferOptions<Event>;

// deno-lint-ignore no-explicit-any, explicit-function-return-type,
function getArgs<T>(args: any[]) {
  if (args.length === 0 || args.length > 2 || typeof args[0] !== "string") {
    throw new TypeError("Invalid arguments");
  }

  const type: string = args[0];
  if (args.length === 1) {
    return {
      type,
      bufferOptions: defaultBufferOptions,
    };
  }

  if (typeof args[1] === "boolean") {
    return {
      type,
      options: args[1],
      bufferOptions: defaultBufferOptions,
    };
  }

  const bufferOptions = {
    bufferSize: args[1]?.bufferSize ?? defaultBufferOptions.bufferSize,
    bufferStrategy: args[1]?.bufferStrategy ??
      defaultBufferOptions.bufferStrategy,
    cancellationToken: args[1]?.cancellationToken,
  } as BufferOptions<T>;

  // deno-lint-ignore no-explicit-any
  const options = ((o: any) => {
    if (o) {
      delete o.bufferSize;
      delete o.bufferStrategy;
      delete o.cancellationToken;
    }
    return o as AddEventListenerOptions;
  })(args[1]);

  return {
    type,
    options,
    bufferOptions: combineWithSignal(options, bufferOptions),
  };
}

// deno-lint-ignore explicit-function-return-type
function combineWithSignal<T>(
  options?: AddEventListenerOptions,
  bufferOptions?: BufferOptions<T>,
) {
  const signalCancellation = typeof options !== "boolean" && options?.signal
    ? cancellationSignal(options.signal)
    : Cancellable.None;

  return {
    bufferSize: bufferOptions?.bufferSize ?? 1,
    bufferStrategy: bufferOptions?.bufferStrategy ?? "latest",
    cancellationToken: Cancellable.combine(
      bufferOptions?.cancellationToken ?? Cancellable.None,
      signalCancellation,
    ),
  };
}

type BufferOptions<T> = {
  bufferStrategy?: BufferStrategyOptions<T>;
  bufferSize?: number;
  cancellationToken?: CancellationToken;
};
