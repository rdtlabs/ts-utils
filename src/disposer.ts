export type Disposer = (() => ReadonlyArray<Error>) & Disposable;
export type DisposerAsync =
  & (() => Promise<ReadonlyArray<Error>>)
  & AsyncDisposable;
export const Disposer = {
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
