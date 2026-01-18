/**
 * A function that schedules callback execution.
 * @param fn The callback to execute
 */
export type Scheduler = (fn: () => void) => void;

/**
 * Built-in schedulers for common use cases.
 */
export const Schedulers = {
  /** Executes callback immediately/synchronously (default) */
  immediate: ((fn) => fn()) as Scheduler,
  /** Executes callback on the microtask queue */
  microtask: queueMicrotask as Scheduler,
  /** Executes callback on the task queue */
  task: ((fn) => setTimeout(fn, 0)) as Scheduler,
} as const;
