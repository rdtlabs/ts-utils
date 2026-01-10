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
import type { CancellationToken } from "../cancellation/CancellationToken.ts";
import type { TimeoutInput } from "../types.ts";

/**
 * Creates a new `Signal` instance with the specified initial state.
 * @param initialState - The initial state of the signal.
 * Defaults to `false` (unsignaled) if not provided.
 * @returns A new `Signal` instance.
 */
export const Signal = (function (
  initialState: SignalState = false,
): Signal {
  return signal(initialState ?? false);
}) as unknown as {
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
  // The current resolve function for the promise
  // When signal is signaled, this is set to SIGNALED sentinel
  let resolve!: () => void;

  // The promise that waiters will wait on
  // When signaled: Promise.resolve() (already resolved)
  // When unsignaled: new Promise that resolves when notify() is called
  let promise!: Promise<void>;

  const setUnsignaled = () => {
    promise = new Promise((r) => resolve = r);
  };

  const setSignaled = () => {
    // Set promise to already-resolved promise
    promise = Promise.resolve();
    // Mark resolve as SIGNALED sentinel to indicate signaled state
    resolve = SIGNALED;
  };

  if (initialState === true) {
    setSignaled();
  } else {
    setUnsignaled();
  }

  const getState = () => resolve === SIGNALED;

  const signal = {
    notify: () => {
      // Only notify if currently unsignaled
      if (resolve !== SIGNALED) {
        const oldResolve = resolve;
        setSignaled();
        // Resolve waiters AFTER updating state to prevent race conditions
        oldResolve();
      }
    },

    notifyAndReset: () => {
      // Notify existing waiters and immediately reset
      if (resolve === SIGNALED) {
        // If signaled, just reset to unsignaled (no one to notify)
        setUnsignaled();
      } else {
        // If already unsignaled, resolve current waiters and create new promise
        const oldResolve = resolve;
        setUnsignaled();
        oldResolve();
      }
    },

    reset: () => {
      if (resolve === SIGNALED) {
        setUnsignaled();
      }
    },

    wait: (arg?: TimeoutInput | CancellationToken): Promise<void> => {
      // Fast path: if already signaled or no cancellation, return promise directly
      if (arg === undefined || getState() === true) {
        return promise;
      }

      // Wrap with cancellation support
      // Use the current promise directly instead of promise.then() to avoid extra microtask
      return Promises.cancellable(
        promise,
        CancellationInput.of(arg),
      );
    },
  };

  Object.defineProperty(signal, "state", {
    get: getState,
  });

  return Object.freeze(signal) as Signal;
}

const SIGNALED = Object.freeze(() => {});
