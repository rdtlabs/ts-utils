import { type CancellationToken } from "../cancellation/CancellationToken.ts";
import { cancellationRace } from "../cancellation/cancellationRace.ts";
import { type Callable, type TimeoutInput } from "../types.ts";
import { delay } from "./delay.ts";
import { Executor } from "./executors.ts";

type Raceable<T> =
  | PromiseLike<T>
  | PromiseLike<T>[]
  | (() => PromiseLike<T> | PromiseLike<T>[]);

export const Task = Object.freeze({
  run<T = void>(
    task: Callable<T | PromiseLike<T>>,
    options?: {
      cancellation?: TimeoutInput | CancellationToken;
      scheduler?: "micro" | "macro" | "sync" | Executor;
    },
  ): Promise<T> {
    const scheduler = getScheduler(options?.scheduler);
    return scheduler.execute(task, options?.cancellation);
  },

  runAfter<T = void>(
    task: Callable<T | PromiseLike<T>>,
    timeoutInput: TimeoutInput,
    cancellation?: CancellationToken,
  ): Promise<T> & Disposable {
    const timer = delay(timeoutInput, cancellation);
    const promise = timer.then(task);
    return Object.defineProperty(promise, Symbol.dispose, {
      value: () => {
        timer[Symbol.dispose]();
      },
    }) as Promise<T> & Disposable;
  },

  race<T>(
    promises: Raceable<T>,
    cancellation?: TimeoutInput | CancellationToken,
  ): Promise<T> {
    return cancellationRace(promises, cancellation);
  },
});

function getScheduler(
  scheduler: "micro" | "macro" | "sync" | Executor | undefined,
): Executor {
  if (!scheduler || scheduler === "sync") {
    return Executor.immediate;
  }

  if (scheduler === "micro") {
    return Executor.micro;
  }

  if (scheduler === "macro") {
    return Executor.macro;
  }

  if (typeof scheduler === "object") {
    return scheduler;
  }

  throw new TypeError("Invalid argument");
}
