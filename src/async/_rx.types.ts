export type Unsubscribe = () => void;

export interface Observable<T> {
  subscribe(subscriber: Subscriber<T>): Unsubscribe;
}

export type Subscriber<T> = {
  next: (value: T) => void;
  error?: (error: unknown) => void;
  complete?: () => void;
} | {
  next: (value: T) => void;
  error: (error: unknown) => void;
  complete?: () => void;
} | {
  next: (value: T) => void;
  error: (error: unknown) => void;
  complete: () => void;
} | {
  next?: (value: T) => void;
  error: (error: unknown) => void;
  complete?: () => void;
} | {
  next?: (value: T) => void;
  error: (error: unknown) => void;
  complete: () => void;
} | {
  next?: (value: T) => void;
  error?: (error: unknown) => void;
  complete: () => void;
};
