/**
 * Represents a function that can dispose of resources and return any errors encountered during disposal.
 * @returns An array of errors encountered during disposal.
 */
export type Disposer = (() => ReadonlyArray<Error>) & Disposable;

/**
 * Represents a type that is both a function returning a promise of an array of errors,
 * and an async disposable object.
 */
export type DisposerAsync =
  & (() => Promise<ReadonlyArray<Error>>)
  & AsyncDisposable;

/**
 * The `Disposer` object provides utility functions for managing disposables.
 */
export const Disposer = {
  /**
   * Creates an asynchronous disposer that can dispose multiple disposables.
   *
   * @param disposables - An array of disposables to be disposed.
   * @returns A `DisposerAsync` function that can be used to dispose the provided disposables asynchronously.
   */
  fromAsync(
    ...disposables:
      (AsyncDisposable | Disposable | (() => void | Promise<void>))[]
  ): DisposerAsync {
    const fn = async () => {
      let errors: Error[] | undefined = undefined;
      for (const disposable of disposables) {
        try {
          if (Symbol.asyncDispose in disposable) {
            await disposable[Symbol.asyncDispose]();
          } else if (Symbol.dispose in disposable) {
            disposable[Symbol.dispose]();
          } else if (typeof disposable === "function") {
            await disposable();
          }
        } catch (e) {
          (errors ?? (errors = [])).push(new Error(e));
        }
      }
      return errors ?? emptyErrorArray;
    };

    return Object.defineProperty(fn, Symbol.asyncDispose, {
      value: async () => {
        await fn();
      },
      writable: false,
      enumerable: false,
      configurable: false,
    }) as DisposerAsync;
  },
  /**
   * Creates a `Disposer` function that disposes a list of disposables.
   * @param disposables - An array of disposables or functions to be disposed.
   * @returns A `Disposer` function that disposes all the provided disposables.
   */
  from(...disposables: (Disposable | (() => void))[]): Disposer {
    const fn = () => {
      let errors: Error[] | undefined = undefined;
      for (const disposable of disposables) {
        try {
          if (Symbol.dispose in disposable) {
            disposable[Symbol.dispose]();
          } else if (typeof disposable === "function") {
            disposable();
          }
        } catch (e) {
          (errors ?? (errors = [])).push(new Error(e));
        }
      }

      return errors ?? emptyErrorArray;
    };

    return Object.defineProperty(fn, Symbol.dispose, {
      value: () => {
        fn();
      },
      writable: false,
      enumerable: false,
      configurable: false,
    }) as Disposer;
  },
  /**
   * Concatenates multiple disposers into a single disposer.
   * When the returned disposer is called, it will invoke all the provided disposers and return any errors encountered.
   * @param disposers The disposers to concatenate.
   * @returns A disposer that invokes all the provided disposers and returns any errors encountered.
   */
  concat(...disposers: Disposer[]): Disposer {
    const fn = () => {
      let errors: Error[] | undefined = undefined;
      for (const disposable of disposers) {
        try {
          const errs = disposable();
          if (errs.length > 0) {
            (errors ?? (errors = [])).push(...errs);
          }
        } catch (e) {
          (errors ?? (errors = [])).push(new Error(e));
        }
      }

      return errors ?? emptyErrorArray;
    };

    return Object.defineProperty(fn, Symbol.dispose, {
      value: () => {
        fn();
      },
      writable: false,
      enumerable: false,
      configurable: false,
    }) as Disposer;
  },
  /**
   * Concatenates multiple disposers into a single asynchronous disposer.
   * @param disposers - An array of disposers or asynchronous disposers.
   * @returns An asynchronous disposer that will dispose all the provided disposers.
   */
  concatAsync(...disposers: (Disposer | DisposerAsync)[]): DisposerAsync {
    const fn = async () => {
      let errors: Error[] | undefined = undefined;
      for (const disposable of disposers) {
        try {
          const errs = await disposable();
          if (errs.length > 0) {
            (errors ?? (errors = [])).push(...errs);
          }
        } catch (e) {
          (errors ?? (errors = [])).push(new Error(e));
        }
      }

      return errors ?? emptyErrorArray;
    };

    return Object.defineProperty(fn, Symbol.asyncDispose, {
      value: async () => {
        await fn();
      },
      writable: false,
      enumerable: false,
      configurable: false,
    }) as DisposerAsync;
  },
};

const emptyErrorArray: ReadonlyArray<Error> = Object.freeze<Array<Error>>([]);
