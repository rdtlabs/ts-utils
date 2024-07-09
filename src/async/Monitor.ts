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
  let waiters = new Array<Deferred<boolean>>();
  let running = 0;

  const monitor = {
    /**
     * Signals one waiting operation to continue.
     */
    pulseOne: () => {
      running++;

      if (waiters.length > 0) {
        const def = waiters.shift()!;
        // deno-lint-ignore no-explicit-any
        def.resolve(true as any);
      }

      running--;
    },

    /**
     * Signals all waiting operations to continue.
     */
    pulseAll: () => {
      for (const def of waiters) {
        // deno-lint-ignore no-explicit-any
        def.resolve(true as any);
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
      running++;
      const def = new Deferred<boolean>(args[0]);
      waiters.push(def);

      running--;

      return def.promise;
    },
  };

  return Object.freeze(monitor);
}
