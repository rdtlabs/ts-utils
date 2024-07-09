import type { CancellationToken } from "../cancellation/CancellationToken.ts";
import type { ErrorLike } from "../index.ts";

export const Promises = Object.freeze({
  cancellableIterable,
  cancellable: (p, c) => {
    const tpl = createCancellablePromise(c);
    if (tpl === undefined) {
      return p instanceof Promise ? p : p();
    }

    if (!tpl.cancellable) {
      return Promise.reject(tpl.error);
    }

    try {
      return Promise.race([
        tpl.cancellable,
        p instanceof Promise ? p : p(),
      ]);
    } catch (error) {
      tpl.unregister();
      return Promise.reject(error);
    }
  },

  race: (p, c) => {
    if (p.length === 0) {
      return c?.isCancelled === true
        ? Promise.reject(c.reason)
        : Promise.race(p); // defer to default logic
    }

    const tpl = createCancellablePromise(c);
    if (tpl === undefined) {
      return Promise.race(p);
    }

    if (!tpl.cancellable) {
      return Promise.reject(tpl.error);
    }

    return Promise.race([
      tpl.cancellable,
      ...p.map((p) => p.finally(tpl.unregister)),
    ]);
  },
}) as Promises;

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
    cancel = () => reject(cancellation.reason);
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

type Promises = {
  cancellableIterable<T>(
    iterable: AsyncIterable<T>,
    cancellation?: CancellationToken,
  ): AsyncGenerator<T>;

  cancellableIterable<T>(
    iterable: AsyncGenerator<T>,
    cancellation?: CancellationToken,
  ): AsyncGenerator<T>;

  cancellable<T>(
    promise: Promise<T> | (() => Promise<T>),
    cancellation?: CancellationToken,
  ): Promise<T>;

  race<T = unknown>(
    promises: Promise<T>[],
    cancellation?: CancellationToken,
  ): Promise<T>;
};
