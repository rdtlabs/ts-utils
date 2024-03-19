import { type CancellationToken } from "../cancellation/CancellationToken.ts";

export function delay<T>(
  ms: number,
  cancellationToken?: CancellationToken,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(resolve, ms);
    if (!cancellationToken || cancellationToken.state === "none") {
      return;
    }

    cancellationToken.register(() => {
      clearTimeout(id);
      reject(cancellationToken.reason);
    });
  });
}
