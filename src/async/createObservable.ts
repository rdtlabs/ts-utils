import type { Observable, Subscriber, Unsubscribe } from "./_rx.types.ts";
import { type Scheduler, Schedulers } from "./scheduler.ts";

type SchedulerType = "micro" | "task" | "sync";

/**
 * Creates an observable that can be subscribed to.
 *
 * @template T - The type of values emitted by the observable.
 * @param {(
 *   subscriber: Required<Subscriber<T>> & { isCancelled: boolean }
 * ) => void} onSubscribed - A function that will be called when a subscriber subscribes to the observable.
 * @param {(SchedulerType | {
 *   scheduler: SchedulerType;
 *   completionScheduler: SchedulerType;
 * })} [options] - Optional options for the observable.
 * @returns {Observable<T>} - The created observable.
 */
export function createObservable<T>(
  onSubscribed: (
    subscriber: Required<Subscriber<T>> & { isCancelled: boolean },
  ) => void,
  options?: SchedulerType | {
    scheduler: SchedulerType;
    completionScheduler: SchedulerType;
  },
): Observable<T> {
  if (!onSubscribed || typeof onSubscribed !== "function") {
    throw new TypeError("Invalid argument");
  }

  let scheduler: Scheduler;
  let completionScheduler: Scheduler;

  if (!options) {
    scheduler = getScheduler("sync");
    completionScheduler = getScheduler("task");
  } else if (typeof options === "string") {
    scheduler = getScheduler(options);
    completionScheduler = getScheduler(options);
  } else {
    scheduler = getScheduler(options.scheduler ?? "sync");
    completionScheduler = getScheduler(
      options.completionScheduler ?? "task",
    );
  }

  let isSubscribed = false;
  return {
    subscribe(subscriber: Subscriber<T>): Unsubscribe {
      if (!subscriber || typeof subscriber !== "object") {
        throw new TypeError("Invalid argument");
      }

      if (isSubscribed) {
        throw new Error("Already subscribed");
      }

      const unsubscribe = () => {
        isSubscribed = false;
        subscriber = null as unknown as Subscriber<T>;
      };

      const onComplete = (fn: (sub: Subscriber<T>) => void) => {
        try {
          const sub = subscriber;
          completionScheduler(() => fn(sub));
        } finally {
          unsubscribe();
        }
      };
      try {
        onSubscribed({
          get isCancelled(): boolean {
            return subscriber === null;
          },
          next: (value: T): void => {
            if (subscriber?.next) {
              const sub = subscriber;
              scheduler(() => sub.next!(value));
            }
          },
          error: (error: unknown): void => {
            if (subscriber?.error) {
              onComplete((sub) => sub.error?.(error as Error));
            }
          },
          complete: (): void => {
            if (subscriber?.complete) {
              onComplete((sub) => sub.complete?.());
            }
          },
        });

        isSubscribed = true;
      } catch (e: unknown) {
        unsubscribe();
        throw e;
      }

      return unsubscribe;
    },
  };
}

function getScheduler<T>(type: SchedulerType): Scheduler {
  if (type === "sync") {
    return Schedulers.immediate;
  }

  if (type === "micro") {
    return Schedulers.microtask;
  }

  if (type === "task") {
    return Schedulers.task;
  }

  throw new TypeError("Invalid argument");
}
