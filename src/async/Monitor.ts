import type { WaitHandle } from "./WaitHandle.ts";
import { Deferred } from "./index.ts";

/**
 * Represents a monitor that allows synchronization of asynchronous operations.
 * @interface
 * @extends WaitHandle
 */
export interface Monitor extends WaitHandle {
  /**
   * Signals one waiting operation to continue.
   */
  pulseOne(): void;

  /**
   * Signals all waiting operations to continue.
   */
  pulseAll(): void;
}

/**
 * Creates a new instance of the Monitor class.
 * @constructor
 * @returns A new instance of the Monitor class.
 */
export const Monitor = function (): {
  new (): Monitor;
} {
  // deno-lint-ignore no-explicit-any
  return monitor() as any;
} as unknown as {
  new (): Monitor;
};

/**
 * Creates a new Monitor object.
 * @returns A new Monitor object.
 */
export function monitor(): Monitor {
  let waiters = new Array<Deferred<true>>();

  const monitor = {
    /**
     * Signals one waiting operation to continue.
     */
    pulseOne: () => {
      // Skip cancelled waiters to ensure pulse reaches an active waiter
      while (waiters.length > 0) {
        const def = waiters.shift()!;
        if (!def.isDone) {
          def.resolve(true);
          break;
        }
      }
    },

    /**
     * Signals all waiting operations to continue.
     */
    pulseAll: () => {
      for (const def of waiters) {
        if (!def.isDone) {
          def.resolve(true);
        }
      }
      waiters = [];
    },

    /**
     * Waits for the monitor to be pulsed.
     * @param args - Optional arguments to pass to the monitor.
     * @returns A promise that resolves when the monitor is pulsed.
     */
    // deno-lint-ignore no-explicit-any
    wait: (...args: any[]): any => {
      const def = new Deferred<true>(args[0]);
      waiters.push(def);
      return def.promise;
    },
  };

  return Object.freeze(monitor);
}
