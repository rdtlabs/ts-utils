/**
 * Represents a signal that can be used for synchronization between asynchronous operations.
 * Implements the `WaitHandle` interface.
 */
export interface Signal extends WaitHandle {
  /**
   * Gets the current state of the signal.
   * Returns `true` if the signal is in the signaled state, `false` otherwise.
   */
  readonly state: SignalState;

  /**
   * Notifies the signal, transitioning it to the signaled state.
   * Any pending or future `wait` operations will be resolved.
   */
  notify(): void;

  /**
   * Notifies the signal and resets it to the unsignaled state.
   * Any pending or future `wait` operations will be resolved.
   */
  notifyAndReset(): void;

  /**
   * Resets the signal to the unsignaled state.
   * Any pending or future `wait` operations will be blocked until the signal is signaled again.
   */
  reset(): void;
}

/**
 * Represents the state of a signal.
 * Can be either `true` (signaled) or `false` (unsignaled).
 */
export type SignalState = Signaled | Unsignaled;

/**
 * Represents the signaled state of a signal.
 */
type Signaled = true;

/**
 * Represents the unsignaled state of a signal.
 */
type Unsignaled = false;

/**
 * Creates a new `Signal` instance with the specified initial state.
 * @param initialState - The initial state of the signal.
 * Defaults to `false` (unsignaled) if not provided.
 * @returns A new `Signal` instance.
 */
import type { WaitHandle } from "./WaitHandle.ts";
import { Promises } from "./Promises.ts";
import { CancellationInput } from "../cancellation/cancellationInput.ts";

/**
 * Creates a new `Signal` instance with the specified initial state.
 * @param initialState - The initial state of the signal.
 * Defaults to `false` (unsignaled) if not provided.
 * @returns A new `Signal` instance.
 */
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

/**
 * Creates a signal object that can be used for synchronization between asynchronous operations.
 *
 * @param initialState - The initial state of the signal. Defaults to `false`.
 * @returns A signal object with various methods for signaling and waiting.
 */
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
