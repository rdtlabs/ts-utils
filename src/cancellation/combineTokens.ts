import { type CancellationToken } from "./CancellationToken.ts";
import { __none } from "./_utils.ts";
import cancellationSignal from "./cancellationSignal.ts";
import { getTimeout } from "./cancellationTimeout.ts";
import unwrapAbortSignal from "./unwrapAbortSignal.ts";

export default function combineTokens(
  ...cancellations: CancellationToken[]
): CancellationToken {
  if (cancellations.length === 0) {
    return __none;
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
    return earliest ?? __none;
  }

  if (earliest) {
    addEventListener(earliest);
  }

  controller.signal.addEventListener("abort", removeAllListeners, {
    once: true,
  });

  return cancellationSignal(controller.signal);
}
