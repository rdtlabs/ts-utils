import type { ErrorLike } from "../types.ts";

export type Unsubscribe = () => void;

export interface Observable<T> {
  subscribe(subscriber: Subscriber<T>): Unsubscribe;
}

export type Subscriber<T> = {
  next: (value: T) => void;
  error?: (error: ErrorLike) => void;
  complete?: () => void;
} | {
  next: (value: T) => void;
  error: (error: ErrorLike) => void;
  complete?: () => void;
} | {
  next: (value: T) => void;
  error: (error: ErrorLike) => void;
  complete: () => void;
} | {
  next?: (value: T) => void;
  error: (error: ErrorLike) => void;
  complete?: () => void;
} | {
  next?: (value: T) => void;
  error: (error: ErrorLike) => void;
  complete: () => void;
} | {
  next?: (value: T) => void;
  error?: (error: ErrorLike) => void;
  complete: () => void;
};
