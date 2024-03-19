import { Deferred } from "./Deferred.ts";
import { WaitHandle } from "./WaitHandle.ts";

export type Monitor = WaitHandle & {
  pulseOne(): void;
  pulseAll(): void;
};

export const Monitor = function () {
  return monitor();
} as unknown as {
  new (): Monitor;
};

export function monitor(): Monitor {
  let waiters = new Array<Deferred<boolean>>();
  let running = 0;
  const monitor = {
    pulseOne: () => {
      running++;
      if (running > 1) {
        console.log("pulseOne", ++running);
      }

      if (waiters.length > 0) {
        const def = waiters.shift()!;
        // deno-lint-ignore no-explicit-any
        def.resolve(true as any);
      }

      running--;
    },
    pulseAll: () => {
      for (const def of waiters) {
        // deno-lint-ignore no-explicit-any
        def.resolve(true as any);
      }

      waiters = [];
    },
    // deno-lint-ignore no-explicit-any
    wait: (...args: any[]): any => {
      running++;
      if (running > 1) {
        console.log("wait", ++running);
      }
      const def = new Deferred<boolean>(args[0]);
      waiters.push(def);

      running--;

      return def.promise;
    },
  };

  return Object.freeze(monitor);
}
