import { ErrorLike } from "../types.ts";
import { Observable, Subscriber, Unsubscribe } from "./_rx.types.ts";

export function createObservable<T>(
  onSubscribed: (
    subscriber: Required<Subscriber<T>> & { isCancelled: boolean },
  ) => void,
  options?: "micro" | "task" | "sync" | {
    scheduler: "micro" | "task" | "sync";
    completionScheduler: "micro" | "task" | "sync";
  },
): Observable<T> {
  let scheduler: Scheduler<T>;
  let completionScheduler: CompletionScheduler<T>;

  if (!options) {
    scheduler = getScheduler("sync");
    completionScheduler = getCompletionScheduler("task");
  } else if (typeof options === "string") {
    scheduler = getScheduler(options);
    completionScheduler = getCompletionScheduler(options);
  } else {
    scheduler = getScheduler(options.scheduler ?? "sync");
    completionScheduler = getCompletionScheduler(
      options.completionScheduler ?? "task",
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
    try {
      this.#isSubscribed = true;
      // deno-lint-ignore no-this-alias
      const self = this;
      const subscription = {
        get isCancelled(): boolean {
          return !self.#isSubscribed;
        },
        next: (value: T): void => {
          if (this.#isSubscribed) {
            this.#scheduler(subRef, value);
          }
        },
        error: (error: ErrorLike): void => {
          if (this.#isSubscribed) {
            this.#isSubscribed = false;
            if (subscriber.error) {
              this.#completionScheduler(subRef, error);
            }
          }
        },
        complete: (): void => {
          if (this.#isSubscribed) {
            this.#isSubscribed = false;
            if (subscriber.complete) {
              this.#completionScheduler(subRef);
            }
          }
        },
      };

      this.#onSubscribed(subscription);
    } catch (e: unknown) {
      this.#isSubscribed = false;
      // deno-lint-ignore no-explicit-any
      subscriber = null as any;
      throw e;
    }

    return () => {
      // deno-lint-ignore no-explicit-any
      subscriber = null as any;
      this.#isSubscribed = false;
    };
  }
}

type SubRef<T> = { current: Subscriber<T> };
type Scheduler<T> = (ref: SubRef<T>, value: T) => void;
type CompletionScheduler<T> = (ref: SubRef<T>, e?: unknown) => void;

function getScheduler<T>(type: "micro" | "task" | "sync"): Scheduler<T> {
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

  if (type === "task") {
    return (ref, value) => {
      setTimeout(() => ref.current?.next?.(value), 0);
    };
  }

  throw new TypeError("Invalid argument");
}

function getCompletionScheduler<T>(
  type: "micro" | "task" | "sync",
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

  if (type === "task") {
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
