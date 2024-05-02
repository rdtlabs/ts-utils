import type { BufferLike } from "../../buffer/BufferLike.ts";
import { Buffer } from "../../buffer/Buffer.ts";
import type { QueueOptions } from "./types.ts";
import { createQueue } from "../../Queue.ts";
import type { Queue } from "../../Queue.ts";

export function __getBufferFromOptions<T>(
  options: QueueOptions<T>,
): BufferLike<T> {
  if (options?.bufferSize !== Infinity) {
    return new Buffer<T>(
      options.bufferSize,
      options.bufferStrategy ?? "fixed",
    );
  }

  if (!("strategy" in options)) {
    return createQueue<T>().toBufferLike();
  }

  throw new Error("Buffer strategy is not supported for infinite buffer");
}

export function __getQueueResolvers<T>(): {
  dequeueResolvers: Queue<{
    resolve: (value: T) => void;
    reject: (reason: unknown) => void;
    getIsCancelled: () => boolean;
  }>;
  enqueueResolver: (
    resolve: (item: T) => void,
    reject: (e: unknown) => void,
    getIsCancelled?: () => boolean,
  ) => void;
} {
  const dequeueResolvers = createQueue<{
    resolve: (value: T) => void;
    reject: (reason: unknown) => void;
    getIsCancelled: () => boolean;
  }>();

  return {
    dequeueResolvers,
    enqueueResolver: (
      resolve: (item: T) => void,
      reject: (e: unknown) => void,
      getIsCancelled?: () => boolean,
    ) => {
      dequeueResolvers.enqueue({
        resolve,
        reject,
        getIsCancelled: getIsCancelled ?? (() => false),
      });
    },
  };
}
