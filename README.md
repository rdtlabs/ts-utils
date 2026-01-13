# @rdtlabs/ts-utils

[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=rdtlabs_ts-utils&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=rdtlabs_ts-utils)

A TypeScript utility library providing async primitives, cancellation patterns, buffers, and crypto helpers. Published on JSR for Deno.

## Installation

### Deno

```bash
deno add jsr:@rdtlabs/ts-utils
```

Or import directly:

```typescript
import { Mutex } from "jsr:@rdtlabs/ts-utils/async";
```

### npm
```bash
npx jsr add @rdtlabs/ts-utils
```

### pnpm
```bash
pnpm i jsr:@rdtlabs/ts-utils
```

### Yarn
```bash
yarn add jsr:@rdtlabs/ts-utils
```

### Bun
```bash
bunx jsr add @rdtlabs/ts-utils
```

## Modules

### `/async` - Async Coordination Primitives

Concurrency patterns inspired by Go, Java, and C#:

- **Synchronization**: `Mutex`, `Semaphore`, `WaitGroup`, `Signal`
- **Task Execution**: `WorkerPool`, `JobPool`, `executor`, `executors`
- **Reactive Streams**: `Flowable`, `FlowProcessor`, `FlowPublisher`
- **Promise Utilities**: `Task`, `Deferred`, `Promises`, `delay`
- **Adapters**: `fromEvent`, `fromObservable`, `fromAsyncIterable`, `fromIterableLike`
- **Queues**: Async queue implementations

```typescript
import { Mutex, Semaphore, WaitGroup } from "@rdtlabs/ts-utils/async";

const mutex = new Mutex();
await mutex.acquire();
try {
  // critical section
} finally {
  mutex.release();
}
```

### `/cancellation` - Cancellation Tokens

C#-inspired cancellation pattern for async operations:

- `CancellationToken` - Token with states: `active`, `cancelled`, `none`
- `CancellationController` - Create and manage cancellation tokens
- `CancellationError` - Error thrown when operations are cancelled
- `cancellablePromise`, `cancellableIterable` - Wrap operations with cancellation support

```typescript
import { CancellationToken } from "@rdtlabs/ts-utils/cancellation";

const controller = CancellationToken.create();
const token = controller.token;

// Register a callback
token.register(() => console.log("Cancelled!"));

// Convert to AbortSignal for fetch, etc.
const signal = token.toAbortSignal();

// Cancel the token
controller.cancel();
```

### `/buffer` - Buffer Strategies

Buffers for adapting unbounded push to pull-based iteration:

- `Buffer` - Standard buffer implementation
- `RingBuffer` - Fixed-size circular buffer
- `BufferStrategy` - Controls overflow behavior (drop, keep latest, throw, keep all)

```typescript
import { RingBuffer } from "@rdtlabs/ts-utils/buffer";

const buffer = new RingBuffer<number>(10);
buffer.push(1);
const value = buffer.shift();
```

### `/crypto` - Encryption Helpers

Simplified encryption/decryption using Web Crypto API:

- `Secret` - Manage encryption with password/secret
- `encryptOnce`, `decryptOnce` - One-shot encryption/decryption

```typescript
import { Secret } from "@rdtlabs/ts-utils/crypto";

const secret = await Secret.from("my-password");
const encrypted = await secret.encrypt("sensitive data");
const decrypted = await secret.decrypt(encrypted);
```

### `/encoding` - Encoding Utilities

Base64 and hex encoding/decoding:

```typescript
import { base64Encode, base64Decode, hexEncode, hexDecode } from "@rdtlabs/ts-utils/encoding";

const encoded = base64Encode(new Uint8Array([1, 2, 3]));
const decoded = base64Decode(encoded);
```

### `/errors` - Error Utilities

Utilities for detecting and handling transient errors:

```typescript
import { isTransientError } from "@rdtlabs/ts-utils/errors";

try {
  await fetchData();
} catch (error) {
  if (isTransientError(error)) {
    // Retry logic
  }
}
```

## Development

### Prerequisites

- [Deno](https://deno.land/) runtime

### Commands

```bash
# Run tests
deno test src/

# Run a single test file
deno test src/path/to/file.test.ts

# Lint
deno lint

# Format
deno fmt

# Type check
deno check
```

## License

MIT License - see [LICENSE](LICENSE) for details.
