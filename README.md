# rdt-utils

[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=rdtlabs_ts-utils&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=rdtlabs_ts-utils)

A comprehensive TypeScript utility library providing robust solutions for async operations, cancellation patterns, buffer management, cryptography, and more.

## Overview

`rdt-utils` is a collection of battle-tested TypeScript utilities consolidated from multiple past projects. This library provides type-safe implementations of common patterns and primitives for building robust asynchronous applications.

## Installation

### NPM
```bash
npm install rdt-utils
```

### Deno
```typescript
import { /* utilities */ } from "jsr:@rdtlabs/ts-utils";
```

## Features

### 🔄 Async Primitives
Coordinated async primitives inspired by patterns from Go, Java, and C#:
- **WaitGroup** - Synchronization primitive for waiting on multiple async operations
- **Mutex** - Mutual exclusion lock for coordinating access to shared resources
- **Semaphore** - Counting semaphore for controlling concurrent access
- **Deferred** - Promise wrapper with external resolution
- **JobPool** - Manage and execute jobs with concurrency control
- **WorkerPool** - Thread pool for distributing work across workers
- **Task** - Enhanced async task management
- **Signal** - Event signaling primitive
- **Monitor** - Thread-safe monitoring utilities
- **Flowable** - Reactive streams implementation with backpressure support

### ❌ Cancellation
C#-inspired cancellation pattern for structured concurrency:
- **CancellationToken** - Token-based cancellation mechanism
- **Cancellable** - Wrapper for cancellable operations
- **CancellationError** - Standard error for cancelled operations
- Support for timeouts, racing tokens, and combining multiple cancellation sources
- Cancellable promises and async iterables
- Integration with AbortSignal

### 📦 Buffer Management
Push/pull semantic buffers for event handling:
- **Buffer** - Generic buffer with configurable strategies
- **RingBuffer** - Circular buffer with bounded capacity
- **BufferStrategy** - Flexible strategies (drop, latest, error, keep-all, custom)
- Used internally for adapting unbounded push to imperative pull patterns

### 🔐 Cryptography
Crypto helpers for encryption/decryption:
- **Secret** - Secure secret/password management
- **encryptOnce** / **decryptOnce** - One-time encryption/decryption utilities
- Built on standard Web Crypto APIs

### 🛠️ Common Utilities
- **objects** - Object manipulation utilities
- **strings** - String processing helpers
- **encoding** - Base64, hex, and other encoding utilities
- **Once** - Execute functions only once
- **Lazy** - Lazy initialization patterns
- **Queue** - Queue data structure
- **List** - List utilities
- **Maybe** - Optional value handling
- **md5** - MD5 hashing
- **deadline** - Deadline management
- **disposer** - Resource disposal patterns

### 🚨 Error Handling
- **error.types** - Type guards and utilities for error detection
- **errors** - Transient error handling utilities
- **DisposedError** - Standard error for disposed resources

## Usage

### Async Operations

```typescript
import { WaitGroup, Mutex, Semaphore, delay } from "rdt-utils/async";

// WaitGroup example
const wg = new WaitGroup();
wg.add(3);

async function worker(id: number) {
  await delay(100 * id);
  console.log(`Worker ${id} done`);
  wg.done();
}

worker(1);
worker(2);
worker(3);
await wg.wait();
console.log("All workers complete");

// Mutex example
const mutex = new Mutex();

async function criticalSection() {
  await mutex.lock();
  try {
    // Only one async operation can be here at a time
    console.log("In critical section");
  } finally {
    mutex.unlock();
  }
}
```

### Cancellation

```typescript
import { 
  createCancellation, 
  cancellablePromise,
  cancellationTimeout 
} from "rdt-utils/cancellation";

const cancellation = createCancellation();

// Cancellable operation
const result = await cancellablePromise(
  longRunningOperation(),
  cancellation.token
);

// Timeout-based cancellation
const timeout = cancellationTimeout(5000); // 5 seconds
try {
  await cancellablePromise(operation(), timeout.token);
} catch (error) {
  if (error instanceof CancellationError) {
    console.log("Operation timed out or was cancelled");
  }
}

// Manual cancellation
cancellation.cancel();
```

### Buffer Management

```typescript
import { Buffer, RingBuffer, BufferStrategy } from "rdt-utils/buffer";

// Create a buffer with drop-oldest strategy
const buffer = new Buffer<number>({
  capacity: 10,
  strategy: BufferStrategy.DropOldest
});

// Push and pull values
buffer.push(1);
buffer.push(2);
const value = buffer.pull(); // 1

// Ring buffer for efficient circular buffering
const ringBuffer = new RingBuffer<string>(5);
ringBuffer.push("a");
ringBuffer.push("b");
```

### Cryptography

```typescript
import { Secret, encryptOnce, decryptOnce } from "rdt-utils/crypto";

const secret = new Secret("my-password");

// Encrypt data
const encrypted = await encryptOnce("sensitive data", secret);

// Decrypt data
const decrypted = await decryptOnce(encrypted, secret);
console.log(decrypted); // "sensitive data"
```

## Module Exports

The library provides granular imports for tree-shaking:

```typescript
import { /* ... */ } from "rdt-utils";           // All utilities
import { /* ... */ } from "rdt-utils/async";      // Async primitives
import { /* ... */ } from "rdt-utils/cancellation"; // Cancellation
import { /* ... */ } from "rdt-utils/buffer";     // Buffer utilities
import { /* ... */ } from "rdt-utils/crypto";     // Crypto helpers
```

## Development Status

This library is actively maintained and evolving. The utilities are being consolidated from multiple production projects with a focus on:
- Type safety
- Comprehensive testing
- Clear documentation
- Zero dependencies (except dev dependencies)

Test coverage is comprehensive but not yet at 100%. Documentation is continuously being improved.

## License

MIT License - Copyright (c) 2024 rdtlabs

See [LICENSE](LICENSE) for full details.
