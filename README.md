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

### `/collections` - Immutable Collections

Persistent, immutable `Set` and `Map` implementations with a builder pattern. All mutation operations return new instances, leaving the original unchanged.

- `ImmutableSet<T>` - Immutable set with `add`, `delete`, `map`, `filter`, `intersect`, and ES2024 set operations
- `ImmutableMap<K, V>` - Immutable map with `set`, `delete`, `merge`, `map`, `filter`
- Builder pattern for efficient batch construction

```typescript
import { ImmutableSet, ImmutableMap } from "@rdtlabs/ts-utils/collections";

const set = ImmutableSet.of([1, 2, 3]);
const withFour = set.add(4);       // new set: {1, 2, 3, 4}
console.log(set.size);             // 3 (original unchanged)

const map = ImmutableMap.builder<string, number>()
  .set("a", 1)
  .set("b", 2)
  .build();
const updated = map.set("c", 3);   // new map with entry added
```

### `/value` - Value Objects

Immutable, branded value objects inspired by DDD. Enforces a max 3-level nesting hierarchy: `CompositeValueObject` → `ValueObject` → `ValuePrimitive`. Exported as `VO` for convenience.

- `VO.object(props)` - Create a flat value object (primitives only)
- `VO.composite(props)` - Create a composite containing flat value objects
- `VO.map(entries)` / `VO.set(items)` - Branded immutable collections of value objects
- `VO.parseObject(json)` / `VO.parseComposite(json)` - Parse from JSON
- `VO.isValueObject()`, `VO.isFlat()`, `VO.isComposite()` - Type guards
- `Branded<T, B>` - Nominal typing for primitives

```typescript
import { VO } from "@rdtlabs/ts-utils/value";
import type { ValueObject, CompositeValueObject, Branded } from "@rdtlabs/ts-utils/value";

type UserId = Branded<string, "UserId">;

type Address = ValueObject<{
  street: string;
  city: string;
  zip: string;
}>;

type Person = CompositeValueObject<{
  name: string;
  address: Address;
  pastAddresses: readonly Address[];
}>;

const address = VO.object<Address>({ street: "123 Main", city: "Springfield", zip: "62704" });
const person = VO.composite<Person>({ name: "Alice", address, pastAddresses: [] });
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
