import type { CancellationToken } from "./CancellationToken.ts";
import { __never } from "./_utils.ts";
import { cancellationSignal } from "./cancellationSignal.ts";
import { getTimeout } from "./cancellationTimeout.ts";
import { unwrapAbortSignal } from "./unwrapAbortSignal.ts";

/**
 * Combines multiple cancellation tokens into a single cancellation token.
 * If no cancellation tokens are provided, the function returns a never-ending cancellation token.
 * If only one cancellation token is provided, that token is returned.
 * If multiple cancellation tokens are provided, a new cancellation token is created that is cancelled
 * when any of the provided cancellation tokens are cancelled.
 *
 * @param cancellations - The cancellation tokens to combine.
 * @returns The combined cancellation token.
 */
export function combineTokens(
  ...cancellations: CancellationToken[]
): CancellationToken {
  if (cancellations.length === 0) {
    return __never;
  }

  if (cancellations.length === 1) {
    return cancellations[0];
  }

  return _combine(cancellations);
}

function _combine(
  cancellations: CancellationToken[],
): CancellationToken {
  const controller = new AbortController();
  const abortListener = () => controller.abort();

  let listeners = new Array<() => void>();
  let earliest: CancellationToken | undefined;

  const addEventListener = (c: CancellationToken) => {
    const signal = unwrapAbortSignal(c);
    signal.addEventListener("abort", abortListener, { once: true });
    listeners.push(
      () => signal.removeEventListener("abort", abortListener),
    );
  };

  const removeAllListeners = () => {
    // remove all listeners
    listeners.forEach((l) => l());
    listeners = undefined!;
  };

  for (const c of cancellations) {
    if (c.isCancelled) {
      removeAllListeners();
      return c;
    }

    if (c.state === "none") {
      continue;
    }

    const timeout = getTimeout(c);
    if (timeout === undefined) {
      addEventListener(c);
    } else if (!earliest || timeout > getTimeout(earliest)!) {
      earliest = c; // keep the nearest timeout
    }
  }

  if (listeners.length === 0) {
    return earliest ?? __never;
  }

  if (earliest) {
    addEventListener(earliest);
  }

  controller.signal.addEventListener("abort", removeAllListeners, {
    once: true,
  });

  return cancellationSignal(controller.signal);
}
