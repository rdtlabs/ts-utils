// import { CancellationError } from "./CancellationError.ts";
// import type { CancellationToken } from "./CancellationToken.ts";
// import type { ErrorLike } from "../types.ts";

// type PromiseExecutor<T> = (
//   resolve: (value: T | PromiseLike<T>) => void,
//   reject: (reason?: unknown) => void,
//   cancel: (reason: ErrorLike) => boolean,
// ) => void;

// export interface CancellablePromise<T = void> extends Promise<T> {
//   cancel: (reason?: ErrorLike) => boolean;
//   readonly isDone: boolean;
//   readonly isCancelled: boolean;
// }

// export function cancellablePromise<T = void>(
//   executor: PromiseExecutor<T>,
//   options?: CancellationToken | ((error: CancellationError) => void) | {
//     token?: CancellationToken;
//     onCancel?: (error: CancellationError) => void;
//   },
// ): CancellablePromise<T> {
//   return new CancellablePromise(executor, options);
// }

// export const CancellablePromise = function <T = void>(
//   executor: PromiseExecutor<T>,
//   options?: CancellationToken | ((error: CancellationError) => void) | {
//     token?: CancellationToken;
//     onCancel?: (error: CancellationError) => void;
//   },
// ): {
//   new <T = void>(
//     executor: PromiseExecutor<T>,
//     options?: CancellationToken | ((error: CancellationError) => void) | {
//       token?: CancellationToken;
//       onCancel?: (error: CancellationError) => void;
//     },
//   ): CancellablePromise<T>;
// } {
//   let status = 0;
//   let unregister: (() => void) | undefined;
//   let resolve!: Resolve<T>;
//   let reject!: (reason?: unknown) => void;
//   const deferred = new Promise<T>((res, rej) => {
//     resolve = res as Resolve<T>;
//     reject = rej;
//   });

//   let cancellationToken: CancellationToken | undefined;
//   let onCancel: ((error: CancellationError) => void) | undefined;
//   if (options) {
//     if (options instanceof Function) {
//       onCancel = options;
//     } else if ("throwIfCancelled" in options) {
//       cancellationToken = options;
//     } else {
//       cancellationToken = options.token;
//       onCancel = options.onCancel;
//     }
//   }

//   const cancel: (reason?: ErrorLike) => boolean = (reason) => {
//     if (status !== 0) {
//       return false;
//     }

//     status = 3;
//     unregister?.();

//     reason = reason && reason instanceof CancellationError
//       ? reason
//       : new CancellationError(undefined, reason);

//     if (onCancel) {
//       queueMicrotask(() => onCancel!(reason));
//     }

//     reject(reason);

//     return true;
//   };

//   const promise = Object.assign(deferred, {
//     cancel,
//     get isCancelled() {
//       return status === 3;
//     },
//     get isDone() {
//       return status !== 0;
//     },
//   }) as CancellablePromise<T>;

//   if (cancellationToken?.isCancelled === true) {
//     cancel(cancellationToken.reason);
//     // deno-lint-ignore no-explicit-any
//     return promise as any;
//   }

//   executor((v) => {
//     if (status !== 0) {
//       return;
//     }
//     status = 1;
//     unregister?.();
//     resolve(v);
//   }, (e) => {
//     if (status !== 0) {
//       return;
//     }

//     if (e instanceof CancellationError) {
//       cancel(e);
//       return;
//     }

//     status = 2;
//     unregister?.();
//     reject(e);
//   }, cancel);

//   if (status === 0 && cancellationToken && cancellationToken.state !== "none") {
//     unregister = cancellationToken.register((t) => cancel(t.reason));
//   }

//   // deno-lint-ignore no-explicit-any
//   return promise as any;
// } as unknown as {
//   new <T = void>(
//     executor: PromiseExecutor<T>,
//     options?: CancellationToken | ((error: CancellationError) => void) | {
//       token?: CancellationToken;
//       onCancel?: (error: CancellationError) => void;
//     },
//   ): CancellablePromise<T>;
// };

// // utility type
// type Resolve<T> = T extends void | undefined
//   ? (value?: T | PromiseLike<T>) => void
//   : (value: T | PromiseLike<T>) => void;
