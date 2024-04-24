import { WaitHandle } from "./WaitHandle.ts";
import { Promises } from "./Promises.ts";
import { CancellationInput } from "../cancellation/cancellationInput.ts";

type Signaled = true;
type Unsignaled = false;

export type SignalState = Signaled | Unsignaled;

export interface Signal extends WaitHandle {
  readonly state: SignalState;
  notify(): void;
  notifyAndReset(): void;
  reset(): void;
}

export const Signal = function (
  initialState: SignalState = false,
): {
  new (
    initialState?: SignalState,
  ): Signal;
} {
  // deno-lint-ignore no-explicit-any
  return signal(initialState ?? false) as any;
} as unknown as {
  new (
    initialState?: SignalState,
  ): Signal;
};

export function signal(initialState: SignalState = false): Signal {
  let resolve!: () => void;
  let promise!: Promise<void>;

  const getAndSetUnsignaled = () => {
    const res = resolve;
    promise = new Promise((r) => resolve = r);
    return res;
  };

  const getAndSetSignaled = () => {
    const res = resolve;
    promise = Promise.resolve();
    resolve = SIGNALED;
    return res;
  };

  if (initialState === true) {
    getAndSetSignaled();
  } else {
    getAndSetUnsignaled();
  }

  const getState = () => resolve === SIGNALED;

  const signal = {
    notify: () => {
      getAndSetSignaled()();
    },

    notifyAndReset: () => {
      getAndSetUnsignaled()();
    },

    reset: () => {
      if (resolve === SIGNALED) {
        getAndSetUnsignaled();
      }
    },

    // deno-lint-ignore no-explicit-any
    wait: (...args: any[]) => {
      if (args.length === 0 || getState() === true) {
        return promise;
      }

      if (args.length !== 1) {
        return Promise.reject(new Error("invalid arguments"));
      }

      return Promises.cancellable(
        promise.then(() => true),
        CancellationInput.of(args[0]),
      );
    },
  };

  Object.defineProperty(signal, "state", {
    get: getState,
  });

  return Object.freeze(signal) as unknown as Signal;
}

const SIGNALED = Object.freeze(() => {});
