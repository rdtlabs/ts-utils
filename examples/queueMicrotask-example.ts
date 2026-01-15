/**
 * Example demonstrating how queueMicrotask works in JavaScript/TypeScript.
 *
 * queueMicrotask schedules a callback to run in the microtask queue, which
 * executes after the current synchronous code completes but before the next
 * macrotask (like setTimeout, setInterval, or I/O callbacks).
 *
 * Execution order:
 * 1. Synchronous code (call stack)
 * 2. Microtasks (queueMicrotask, Promise.then/catch/finally)
 * 3. Macrotasks (setTimeout, setInterval, I/O)
 */

console.log("=== queueMicrotask Example ===\n");

// Example 1: Basic execution order
console.log("--- Example 1: Basic Execution Order ---");

console.log("1. Synchronous: Start");

setTimeout(() => {
  console.log("4. Macrotask: setTimeout callback");
}, 0);

queueMicrotask(() => {
  console.log("3. Microtask: queueMicrotask callback");
});

console.log("2. Synchronous: End");

// Example 2: Microtasks vs Promises (both use microtask queue)
console.log("\n--- Example 2: Microtasks vs Promises ---");

queueMicrotask(() => {
  console.log("Microtask 1");
});

Promise.resolve().then(() => {
  console.log("Promise 1");
});

queueMicrotask(() => {
  console.log("Microtask 2");
});

Promise.resolve().then(() => {
  console.log("Promise 2");
});

// Example 3: Nested microtasks
console.log("\n--- Example 3: Nested Microtasks ---");

queueMicrotask(() => {
  console.log("Outer microtask - start");

  queueMicrotask(() => {
    console.log("Inner microtask 1");
  });

  queueMicrotask(() => {
    console.log("Inner microtask 2");
  });

  console.log("Outer microtask - end");
});

// Example 4: Practical use case - batching DOM updates (conceptual)
console.log("\n--- Example 4: Batching Updates ---");

class BatchedUpdater {
  private pendingUpdates: string[] = [];
  private scheduled = false;

  addUpdate(update: string): void {
    this.pendingUpdates.push(update);

    if (!this.scheduled) {
      this.scheduled = true;
      queueMicrotask(() => this.flush());
    }
  }

  private flush(): void {
    console.log(`Flushing ${this.pendingUpdates.length} batched updates:`);
    for (const update of this.pendingUpdates) {
      console.log(`  - ${update}`);
    }
    this.pendingUpdates = [];
    this.scheduled = false;
  }
}

const updater = new BatchedUpdater();
updater.addUpdate("Update 1");
updater.addUpdate("Update 2");
updater.addUpdate("Update 3");
// All three updates will be batched and flushed together

// Example 5: Difference between microtask and macrotask timing
console.log("\n--- Example 5: Timing Comparison ---");

const start = performance.now();

setTimeout(() => {
  console.log(`Macrotask executed after ${(performance.now() - start).toFixed(2)}ms`);
}, 0);

queueMicrotask(() => {
  console.log(`Microtask executed after ${(performance.now() - start).toFixed(2)}ms`);
});

console.log("\n=== End of synchronous code ===");
console.log("(Microtasks will run next, then macrotasks)\n");
