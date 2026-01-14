import type { Observable, Subscriber } from "./_rx.types.ts";

export type ObservableEmitter<T> = {
  subscribe(subscriber: Subscriber<T>): void;
  unsubscribe(subscriber: Partial<Subscriber<T>>): void;
  next(value: T): void;
  error(error: Error): void;
  complete(): void;
  toObservable(): Observable<T>;
};

/**
 * Creates a new instance of ObservableEmitter.
 * @constructor
 * @returns A new instance of ObservableEmitter.
 */
export const ObservableEmitter = function <T>(): ObservableEmitter<T> {
  return observableEmitter<T>();
} as unknown as {
  new <T>(): ObservableEmitter<T>;
};

export function observableEmitter<T>(): ObservableEmitter<T> {
  let subscribers: Array<Partial<Subscriber<T>>> | undefined = [];
  return {
    subscribe(subscriber: Subscriber<T>): void {
      if (subscribers === undefined) {
        if (subscriber.complete) {
          subscriber.complete();
        }
      } else {
        subscribers.push(subscriber);
      }
    },
    unsubscribe(subscriber: Partial<Subscriber<T>>): void {
      if (subscribers === undefined) {
        return;
      }
      const idx = subscribers.indexOf(subscriber);
      if (idx !== -1) {
        subscribers.splice(idx, 1);
      }
    },

    next(value: T): void {
      if (subscribers === undefined) {
        return;
      }

      const observers = subscribers;
      for (const observer of observers) {
        if (observer.next) {
          observer.next(value);
        }
      }
    },

    error(error: Error): void {
      if (subscribers === undefined) {
        return;
      }

      const observers = subscribers;
      subscribers = undefined;
      for (const observer of observers) {
        if (observer.error) {
          observer.error(error);
        }
      }
    },

    complete(): void {
      if (subscribers === undefined) {
        return;
      }

      const observers = subscribers;
      subscribers = undefined;
      for (const observer of observers) {
        if (observer.complete) {
          observer.complete();
        }
      }
    },

    toObservable(): Observable<T> {
      return Object.seal({
        subscribe: (observer: Subscriber<T>) => {
          this.subscribe(observer);
          return () => {
            this.unsubscribe(observer);
          };
        },
      });
    },
  };
}
