import type { CancellationToken } from "../cancellation/CancellationToken.ts";
import type { ErrorLike } from "../index.ts";

/**
 * A collection of utility functions for working with Promises.
 * @module Promises
 */
export const Promises = Object.freeze({
  cancellableIterable,
  cancellable: async (p, c) => {
    const tpl = createCancellablePromise(c);
    if (tpl === undefined) {
      return await (p instanceof Promise ? p : p());
    }

    if (!tpl.cancellable) {
      throw tpl.error;
    }

    try {
      return await Promise.race([
        tpl.cancellable,
        p instanceof Promise ? p : p(),
      ]);
    } catch (e) {
      tpl.unregister();
      throw e;
    }
  },

  race: (p, c) => {
    if (p.length === 0) {
      return c?.isCancelled === true
        ? Promises.reject(c.reason)
        : Promise.race(p); // defer to default logic
    }

    const tpl = createCancellablePromise(c);
    if (tpl === undefined) {
      return Promise.race(p);
    }

    if (!tpl.cancellable) {
      return Promises.reject(tpl.error);
    }

    return Promise.race([
      tpl.cancellable,
      ...p.map((p) => p.finally(tpl.unregister)),
    ]);
  },

  reject: (reason: ErrorLike, altMessage?: string) => {
    if (reason instanceof Error) {
      return Promise.reject(reason);
    }

    if (typeof reason === "string") {
      return Promise.reject(new Error(reason));
    }

    return Promise.reject(
      new Error(altMessage ?? "An unknown error occurred", { cause: reason }),
    );
  },
}) as {
  /**
   * Creates an async generator that can be cancelled.
   * @param iterable The iterable to iterate over.
   * @param cancellation The cancellation token to use.
   */
  cancellableIterable<T>(
    iterable: AsyncIterable<T>,
    cancellation?: CancellationToken,
  ): AsyncGenerator<T>;

  /**
   * Creates a cancellable promise that can be cancelled.
   * @param iterable The iterable to iterate over.
   * @param cancellation The cancellation token to use.
   */
  cancellableIterable<T>(
    iterable: AsyncGenerator<T>,
    cancellation?: CancellationToken,
  ): AsyncGenerator<T>;

  /**
   * Creates a cancellable promise that can be cancelled.
   * @param promise The promise to wrap.
   * @param cancellation The cancellation token to use.
   */
  cancellable<T>(
    promise: Promise<T> | (() => Promise<T>),
    cancellation?: CancellationToken,
  ): Promise<T>;

  /**
   * Returns a promise that resolves or rejects with the first settled promise.
   * @param promises the array of promises for use.
   * @param cancellation The cancellation token to use.
   */
  race<T = unknown>(
    promises: Promise<T>[],
    cancellation?: CancellationToken,
  ): Promise<T>;

  /**
   * Returns a promise that rejects with the given reason.
   * @param reason The reason for the rejection.
   * @param altMessage An alternative message to use if the reason is not an Error.
   */
  reject<T = never>(
    reason: ErrorLike,
    altMessage?: string,
  ): Promise<T>;
};

async function* cancellableIterable<T>(
  iterable: AsyncGenerator<T> | AsyncIterable<T>,
  cancellation?: CancellationToken,
): AsyncGenerator<T> {
  const tpl = createCancellablePromise<T>(cancellation);
  if (tpl === undefined) {
    return yield* iterable as AsyncGenerator<T>;
  }

  if (!tpl.cancellable) {
    throw tpl.error;
  }

  try {
    const it = iterable[Symbol.asyncIterator]();
    do {
      const { done, value } = await Promise.race([
        tpl.cancellable,
        it.next(),
      ]);

      if (done) {
        break;
      }

      yield value;
    } while (true);
  } finally {
    tpl.unregister();
  }
}

function createCancellablePromise<T>(
  cancellation?: CancellationToken,
): undefined | Maybe<T> {
  if (!cancellation || cancellation.state === "none") {
    return undefined;
  }

  if (cancellation.isCancelled === true) {
    return { error: cancellation.reason };
  }

  let cancel!: () => void;
  const cancellable = new Promise<never>((_, reject) => {
    cancel = () => {
      const reason = cancellation.reason as unknown as ErrorLike;
      reject(
        reason instanceof Error
          ? reason
          : new Error("Operation cancelled", { cause: reason }),
      );
    };
  });

  const unregister = cancellation.register(cancel);
  return {
    cancellable,
    unregister,
  };
}

type Maybe<T> = {
  cancellable: Promise<never>;
  unregister: () => void;
} | {
  cancellable?: undefined;
  error: ErrorLike;
};
