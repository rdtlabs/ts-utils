import type { ErrorLike } from "../types.ts";
import type { Observable, Subscriber, Unsubscribe } from "./_rx.types.ts";

/**
 * Creates an observable that can be subscribed to.
 *
 * @template T - The type of values emitted by the observable.
 * @param {(
 *   subscriber: Required<Subscriber<T>> & { isCancelled: boolean }
 * ) => void} onSubscribed - A function that will be called when a subscriber subscribes to the observable.
 * @param {("micro" | "macro" | "sync" | {
 *   scheduler: "micro" | "macro" | "sync";
 *   completionScheduler: "micro" | "macro" | "sync";
 * })} [options] - Optional options for the observable.
 * @returns {Observable<T>} - The created observable.
 */
export function createObservable<T>(
  onSubscribed: (
    subscriber: Required<Subscriber<T>> & { isCancelled: boolean },
  ) => void,
  options?: "micro" | "macro" | "sync" | {
    scheduler: "micro" | "macro" | "sync";
    completionScheduler: "micro" | "macro" | "sync";
  },
): Observable<T> {
  let scheduler: Scheduler<T>;
  let completionScheduler: CompletionScheduler<T>;

  if (!options) {
    scheduler = getScheduler("sync");
    completionScheduler = getCompletionScheduler("macro");
  } else if (typeof options === "string") {
    scheduler = getScheduler(options);
    completionScheduler = getCompletionScheduler(options);
  } else {
    scheduler = getScheduler(options.scheduler ?? "sync");
    completionScheduler = getCompletionScheduler(
      options.completionScheduler ?? "macro",
    );
  }

  return new ObservableImpl(onSubscribed, scheduler, completionScheduler);
}

class ObservableImpl<T> {
  #scheduler: Scheduler<T>;
  #completionScheduler: CompletionScheduler<T>;
  #isSubscribed = false;
  #onSubscribed: (
    subscriber: Required<Subscriber<T>> & { isCancelled: boolean },
  ) => void;

  constructor(
    onSubscribed: (
      subscriber: Required<Subscriber<T>> & { isCancelled: boolean },
    ) => void,
    scheduler: Scheduler<T>,
    completionScheduler: CompletionScheduler<T>,
  ) {
    if (typeof onSubscribed !== "function") {
      throw new TypeError("Invalid argument");
    }

    this.#onSubscribed = onSubscribed;
    this.#scheduler = scheduler;
    this.#completionScheduler = completionScheduler;
  }

  subscribe(subscriber: Subscriber<T>): Unsubscribe {
    if (!subscriber || typeof subscriber !== "object") {
      throw new TypeError("Invalid argument");
    }

    if (this.#isSubscribed) {
      throw new Error("Already subscribed");
    }

    const subRef = { current: subscriber };
    // deno-lint-ignore no-this-alias
    const self = this;

    try {
      self.#isSubscribed = true;
      const subscription = {
        get isCancelled(): boolean {
          return !self.#isSubscribed;
        },
        next: (value: T): void => {
          if (self.#isSubscribed) {
            self.#scheduler(subRef, value);
          }
        },
        error: (error: ErrorLike): void => {
          if (self.#isSubscribed) {
            self.#isSubscribed = false;
            if (subscriber.error) {
              self.#completionScheduler(subRef, error);
            }
          }
        },
        complete: (): void => {
          if (self.#isSubscribed) {
            self.#isSubscribed = false;
            if (subscriber.complete) {
              self.#completionScheduler(subRef);
            }
          }
        },
      };

      self.#onSubscribed(subscription);
    } catch (e: unknown) {
      self.#isSubscribed = false;
      // deno-lint-ignore no-explicit-any
      subscriber = null as any;
      throw e;
    }

    return () => {
      // deno-lint-ignore no-explicit-any
      subscriber = null as any;
      self.#isSubscribed = false;
    };
  }
}

type SubRef<T> = { current: Subscriber<T> };
type Scheduler<T> = (ref: SubRef<T>, value: T) => void;
type CompletionScheduler<T> = (ref: SubRef<T>, e?: unknown) => void;

function getScheduler<T>(type: "micro" | "macro" | "sync"): Scheduler<T> {
  if (type === "sync") {
    return (ref, value) => {
      ref.current?.next?.(value);
    };
  }

  if (type === "micro") {
    return (ref, value) => {
      queueMicrotask(() => ref.current?.next?.(value));
    };
  }

  if (type === "macro") {
    return (ref, value) => {
      setTimeout(() => ref.current?.next?.(value), 0);
    };
  }

  throw new TypeError("Invalid argument");
}

function getCompletionScheduler<T>(
  type: "micro" | "macro" | "sync",
): CompletionScheduler<T> {
  if (type === "sync") {
    return (ref, e) => {
      if (e) {
        ref.current.error?.(e);
      } else {
        ref.current.complete?.();
      }
    };
  }

  if (type === "micro") {
    return (ref, e) => {
      queueMicrotask(() => {
        if (e) {
          ref.current.error?.(e);
        } else {
          ref.current.complete?.();
        }
      });
    };
  }

  if (type === "macro") {
    return (ref, e) => {
      setTimeout(() => {
        if (e) {
          ref.current.error?.(e);
        } else {
          ref.current.complete?.();
        }
      }, 0);
    };
  }

  throw new TypeError("Invalid argument");
}
