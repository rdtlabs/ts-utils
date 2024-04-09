import { DisposedError } from "../DisposedError.ts";
import { type CancellationToken } from "../cancellation/CancellationToken.ts";
import { deriveTimeout } from "../deriveTimeout.ts";
import { TimeoutInput } from "../types.ts";

export function delay(
  ms: TimeoutInput,
  cancellationToken?: CancellationToken,
): Promise<void> & Disposable {
  const millis = deriveTimeout(ms);
  let rej!: (reason: unknown) => void;
  let id!: number;
  let unregister: (() => void) | undefined;
  const promise = new Promise((resolve, reject) => {
    rej = reject;
    id = setTimeout(resolve, millis);
    if (!cancellationToken || cancellationToken.state === "none") {
      return;
    }

    unregister = cancellationToken.register(() => {
      clearTimeout(id);
      reject(cancellationToken.reason);
    });
  });

  return Object.defineProperty(promise, Symbol.dispose, {
    value: () => {
      clearTimeout(id);
      unregister?.();
      rej(new DisposedError());
    },
  }) as Promise<void> & Disposable;
}
