/**
 * A custom implementation of a microtask-like queue scheduler.
 *
 * This demonstrates how microtask queues work under the covers:
 * - Tasks (continuations) are queued for deferred execution
 * - The scheduler drains the queue after the current synchronous work
 * - Tasks queued during execution are processed in the same flush cycle
 */

type Continuation = () => void;

/**
 * A scheduler that manages a queue of continuations, similar to how
 * the JavaScript engine's microtask queue operates internally.
 */
class MicrotaskScheduler {
  private queue: Continuation[] = [];
  private isProcessing = false;

  /**
   * Queue a continuation to be executed by the scheduler.
   * If the scheduler is already processing, the task will be
   * picked up in the current flush cycle.
   */
  queueTask(task: Continuation): void {
    this.queue.push(task);

    // If we're not already processing, schedule a flush
    if (!this.isProcessing) {
      this.scheduleFlush();
    }
  }

  /**
   * Schedule the queue to be flushed. In a real implementation,
   * this would hook into the event loop. Here we use queueMicrotask
   * to simulate deferring to after synchronous code completes.
   */
  private scheduleFlush(): void {
    // Use the platform's microtask queue to defer execution
    // In a VM implementation, this would be the actual event loop integration
    queueMicrotask(() => this.flush());
  }

  /**
   * Process all queued tasks. Tasks added during processing
   * are also executed in this same cycle (like real microtasks).
   */
  private flush(): void {
    this.isProcessing = true;

    // Process until queue is empty (including tasks added during processing)
    while (this.queue.length > 0) {
      const task = this.queue.shift()!;
      try {
        task();
      } catch (error) {
        // In production, you'd want proper error handling
        console.error("Task error:", error);
      }
    }

    this.isProcessing = false;
  }
}

/**
 * A fully custom scheduler that doesn't rely on the platform's microtask queue.
 * This is closer to how you'd implement this in a VM or custom runtime.
 */
class CustomEventLoop {
  private microtaskQueue: Continuation[] = [];
  private macrotaskQueue: Continuation[] = [];
  private isRunning = false;

  /**
   * Queue a microtask (high priority, runs before macrotasks)
   */
  queueMicrotask(task: Continuation): void {
    this.microtaskQueue.push(task);
  }

  /**
   * Queue a macrotask (lower priority, like setTimeout)
   */
  queueMacrotask(task: Continuation): void {
    this.macrotaskQueue.push(task);
  }

  /**
   * Run the event loop until all queues are empty.
   * This simulates one "tick" of an event loop.
   */
  run(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    // Keep running while there's work to do
    while (this.microtaskQueue.length > 0 || this.macrotaskQueue.length > 0) {
      // First: drain ALL microtasks (including newly added ones)
      this.drainMicrotasks();

      // Then: process ONE macrotask (if any)
      if (this.macrotaskQueue.length > 0) {
        const macrotask = this.macrotaskQueue.shift()!;
        this.executeTask(macrotask, "macrotask");

        // After each macrotask, drain microtasks again
        this.drainMicrotasks();
      }
    }

    this.isRunning = false;
  }

  private drainMicrotasks(): void {
    while (this.microtaskQueue.length > 0) {
      const task = this.microtaskQueue.shift()!;
      this.executeTask(task, "microtask");
    }
  }

  private executeTask(task: Continuation, type: string): void {
    try {
      task();
    } catch (error) {
      console.error(`${type} error:`, error);
    }
  }
}

/**
 * Promise-like implementation using our custom scheduler.
 * Demonstrates how Promise.then() uses the microtask queue.
 */
class CustomPromise<T> {
  private state: "pending" | "fulfilled" | "rejected" = "pending";
  private value?: T;
  private error?: unknown;
  private continuations: Array<{
    onFulfilled?: (value: T) => void;
    onRejected?: (error: unknown) => void;
  }> = [];

  constructor(
    private scheduler: MicrotaskScheduler,
    executor: (
      resolve: (value: T) => void,
      reject: (error: unknown) => void
    ) => void
  ) {
    try {
      executor(
        (value) => this.resolve(value),
        (error) => this.reject(error)
      );
    } catch (error) {
      this.reject(error);
    }
  }

  private resolve(value: T): void {
    if (this.state !== "pending") return;
    this.state = "fulfilled";
    this.value = value;
    this.scheduleContinuations();
  }

  private reject(error: unknown): void {
    if (this.state !== "pending") return;
    this.state = "rejected";
    this.error = error;
    this.scheduleContinuations();
  }

  private scheduleContinuations(): void {
    for (const cont of this.continuations) {
      this.scheduler.queueTask(() => {
        if (this.state === "fulfilled" && cont.onFulfilled) {
          cont.onFulfilled(this.value!);
        } else if (this.state === "rejected" && cont.onRejected) {
          cont.onRejected(this.error);
        }
      });
    }
    this.continuations = [];
  }

  then(
    onFulfilled?: (value: T) => void,
    onRejected?: (error: unknown) => void
  ): void {
    if (this.state === "pending") {
      this.continuations.push({ onFulfilled, onRejected });
    } else {
      // Already settled - queue the continuation as a microtask
      this.scheduler.queueTask(() => {
        if (this.state === "fulfilled" && onFulfilled) {
          onFulfilled(this.value!);
        } else if (this.state === "rejected" && onRejected) {
          onRejected(this.error);
        }
      });
    }
  }
}

// ============================================================
// Demo
// ============================================================

console.log("=== Custom Microtask Scheduler Demo ===\n");

// Demo 1: Basic MicrotaskScheduler
console.log("--- Demo 1: MicrotaskScheduler ---");
const scheduler = new MicrotaskScheduler();

console.log("1. Queueing tasks...");

scheduler.queueTask(() => {
  console.log("3. First task executed");

  // Queue a nested task - will run in same flush cycle
  scheduler.queueTask(() => {
    console.log("4. Nested task executed");
  });
});

scheduler.queueTask(() => {
  console.log("5. Second task executed");
});

console.log("2. Synchronous code continues...");

// Demo 2: Custom Event Loop (fully self-contained)
setTimeout(() => {
  console.log("\n--- Demo 2: Custom Event Loop ---");

  const eventLoop = new CustomEventLoop();

  eventLoop.queueMacrotask(() => {
    console.log("Macrotask 1");
    eventLoop.queueMicrotask(() => console.log("  Microtask from Macrotask 1"));
  });

  eventLoop.queueMicrotask(() => {
    console.log("Initial Microtask 1");
    eventLoop.queueMicrotask(() => console.log("  Nested Microtask"));
  });

  eventLoop.queueMacrotask(() => {
    console.log("Macrotask 2");
  });

  eventLoop.queueMicrotask(() => {
    console.log("Initial Microtask 2");
  });

  console.log("Starting custom event loop...");
  eventLoop.run();
  console.log("Event loop complete.");
}, 100);

// Demo 3: CustomPromise using our scheduler
setTimeout(() => {
  console.log("\n--- Demo 3: CustomPromise with Scheduler ---");

  const promiseScheduler = new MicrotaskScheduler();

  const promise = new CustomPromise<string>(promiseScheduler, (resolve) => {
    console.log("1. Promise executor runs synchronously");
    resolve("Hello from CustomPromise!");
  });

  promise.then((value) => {
    console.log(`3. Promise resolved with: ${value}`);
  });

  console.log("2. Code after .then() - continuation is queued");
}, 200);

console.log("\n(Async demos will follow...)\n");
