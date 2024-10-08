import type { ErrorLike } from "../types.ts";
import type { Observable, Subscriber, Unsubscribe } from "./_rx.types.ts";

type SchedulerType = "micro" | "macro" | "sync";

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
  readonly #scheduler: Scheduler<T>;
  readonly #completionScheduler: CompletionScheduler<T>;
  readonly #onSubscribed: (
    subscriber: Required<Subscriber<T>> & { isCancelled: boolean },
  ) => void;

  #isSubscribed = false;

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

function getScheduler<T>(type: SchedulerType): Scheduler<T> {
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

function setRef<T>(ref: SubRef<T>, e: unknown): void {
  if (e) {
    ref.current.error?.(e as ErrorLike);
  } else {
    ref.current.complete?.();
  }
}

function getCompletionScheduler<T>(
  type: SchedulerType,
): CompletionScheduler<T> {
  if (type === "sync") {
    return setRef;
  }

  if (type === "micro") {
    return (ref, e) => queueMicrotask(() => setRef(ref, e));
  }

  if (type === "macro") {
    return (ref, e) => setTimeout(() => setRef(ref, e), 0);
  }

  throw new TypeError("Invalid argument");
}
