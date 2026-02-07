# Alternative Libraries for @rdtlabs/ts-utils

This document maps each functional area of `@rdtlabs/ts-utils` to well-maintained, popular alternative libraries.

## Quick Reference

| Functional Area | Recommended Alternative(s) |
|---|---|
| Async coordination (Mutex, Semaphore, WaitGroup) | [async-mutex](https://www.npmjs.com/package/async-mutex) + [@core/asyncutil](https://jsr.io/@core/asyncutil) |
| Reactive streams / Flowable | [RxJS](https://rxjs.dev/) |
| Task execution (WorkerPool, JobPool) | [p-queue](https://www.npmjs.com/package/p-queue) + [p-limit](https://www.npmjs.com/package/p-limit) |
| Retry with backoff | [Cockatiel](https://www.npmjs.com/package/cockatiel) or [p-retry](https://www.npmjs.com/package/p-retry) |
| Rate limiting | [p-throttle](https://www.npmjs.com/package/p-throttle) or Cockatiel bulkhead |
| Cancellation (CancellationToken) | Native `AbortController` / `AbortSignal` |
| Crypto (AES-GCM encryption) | Native `crypto.subtle` or [easy-web-crypto](https://www.npmjs.com/package/easy-web-crypto) |
| Encoding (Base64, Hex) | [@std/encoding](https://jsr.io/@std/encoding) |
| Maybe / Optional monad | [true-myth](https://www.npmjs.com/package/true-myth) |
| Queue | [denque](https://www.npmjs.com/package/denque) |
| List utilities (groupBy, distinct) | [remeda](https://www.npmjs.com/package/remeda) |
| Object/string utilities | [remeda](https://www.npmjs.com/package/remeda) |
| Deadline / timeout | [@std/async](https://jsr.io/@std/async) `deadline()` or [p-timeout](https://www.npmjs.com/package/p-timeout) |
| Error classification | [Cockatiel](https://www.npmjs.com/package/cockatiel) + [@curveball/http-errors](https://github.com/curveball/http-errors) |

---

## Detailed Breakdown

### 1. Async Coordination Primitives (Mutex, Semaphore, WaitGroup, Signal, Monitor)

**[async-mutex](https://www.npmjs.com/package/async-mutex)** — ~4.7M weekly downloads, ~1,400 GitHub stars
- Provides `Mutex` and weighted `Semaphore` with timeout, priority, and `runExclusive()` for safe auto-release
- TypeScript-native, ESM-compatible, works with Deno

**[@core/asyncutil](https://jsr.io/@core/asyncutil)** — JSR package for Deno
- Provides `Semaphore`, `WaitGroup`, `Barrier`, and `AsyncValue`
- Best Deno-native option for the full set of coordination primitives

**[@std/async](https://jsr.io/@std/async)** — Deno standard library
- Includes unstable `Semaphore`, `delay`, `debounce`, and pooling utilities

| ts-utils | async-mutex | @core/asyncutil | @std/async |
|---|---|---|---|
| `Mutex` | `Mutex` | — | — |
| `Semaphore` | `Semaphore` (weighted) | `Semaphore` | `unstable-semaphore` |
| `WaitGroup` | — | `WaitGroup` | — |
| `Signal` | — | `AsyncValue` (partial) | — |
| `Monitor` | `Mutex` + `Semaphore` combo | — | — |

### 2. Reactive Streams / Flowable

**[RxJS](https://rxjs.dev/)** — ~44M weekly downloads, ~30K GitHub stars
- Full observable/subscriber model with extensive operators: `filter`, `map`, `switchMap`, `mergeMap`, `takeUntil`, `takeWhile`, `distinctUntilChanged`, `bufferCount`, `skip`, etc.
- `fromEvent()`, `from()` for iterables/observables, pipe-based composition
- Works in Deno via `npm:rxjs`

Lighter alternatives:
- **[Most.js](https://github.com/cujojs/most)** — High-performance, monadic streams
- **[xstream](https://www.npmjs.com/package/xstream)** — Minimal, ~79K weekly downloads

### 3. Task Execution (WorkerPool, JobPool, Rate Limiting, Retry)

**[p-queue](https://www.npmjs.com/package/p-queue)** — Promise queue with concurrency control, priority, and timeout. Replaces `WorkerPool` and `JobPool`.

**[p-limit](https://www.npmjs.com/package/p-limit)** — Simple concurrency cap on async function execution.

**[p-retry](https://www.npmjs.com/package/p-retry)** — Retry with exponential backoff and attempt tracking.

**[p-throttle](https://www.npmjs.com/package/p-throttle)** — Rate limiting (calls per interval).

**[Cockatiel](https://www.npmjs.com/package/cockatiel)** — ~1.1M downloads, zero deps, TypeScript-first
- Retry (exponential, constant, delegate backoff), circuit breaker, timeout, bulkhead (concurrency limiting), fallback
- Policy composition via `wrap()`. Modeled after .NET Polly.
- Uses native `AbortSignal` for cancellation.
- Can replace `p-retry` + `p-throttle` + error classification in one package.

| ts-utils | p-queue | p-retry | Cockatiel |
|---|---|---|---|
| `WorkerPool` / `JobPool` | `PQueue` | — | Bulkhead |
| Rate limiting | — | — | Bulkhead + Timeout |
| Retry with backoff | — | `pRetry` | Retry policy |
| `Executor` | `PQueue.add()` | — | `policy.execute()` |

### 4. Cancellation (CancellationToken, CancellationController)

**Native `AbortController` / `AbortSignal`** — Built into Deno, Node.js 16+, and browsers. Covers most use cases without any library.

- `AbortController.abort()` → replaces `CancellationController.cancel()`
- `AbortSignal.aborted` → replaces `CancellationToken.isCancelled`
- `AbortSignal.reason` → replaces `CancellationToken.reason`
- `AbortSignal.addEventListener('abort', cb)` → replaces `CancellationToken.register(cb)`
- `AbortSignal.timeout(ms)` → replaces deadline-based cancellation

For composite/linked signals: **[@azure/abort-controller](https://www.npmjs.com/package/@azure/abort-controller)** from Microsoft.

### 5. Crypto Helpers (AES-GCM encryption/decryption)

**Native `crypto.subtle`** — The Web Crypto API is built into Deno and Node.js. For AES-GCM, a direct implementation is straightforward.

**[easy-web-crypto](https://www.npmjs.com/package/easy-web-crypto)** — Convenience wrapper providing AES-GCM encrypt/decrypt, key generation, PBKDF2 key derivation, and ECDSA signing.

### 6. Buffer Strategies (RingBuffer, overflow strategies)

**[ring-buffer-ts](https://www.npmjs.com/package/ring-buffer-ts)** — TypeScript-native ring buffer with strict mode.

**Web Streams API** — `ReadableStream` / `WritableStream` with built-in backpressure via `highWaterMark` queuing strategy. Native in Deno.

For push-to-pull adaptation with overflow strategies specifically, RxJS operators (`bufferCount`, `bufferTime`, `sample`) provide the closest equivalent.

### 7. Encoding (Base64, Hex)

**[@std/encoding](https://jsr.io/@std/encoding)** — Deno standard library
- `encodeBase64`, `decodeBase64`, `encodeHex`, `decodeHex`, plus varint encoding
- Works cross-runtime (Deno, Node.js via JSR, browsers)

### 8. Data Structures

**[true-myth](https://www.npmjs.com/package/true-myth)** — ~225K weekly downloads, ~1,200 GitHub stars
- `Maybe<T>` (Nothing/Just) and `Result<T,E>` (Ok/Err). TypeScript-first, ~2.2KB, tree-shakeable.
- Inspired by Rust's `Option` and `Result`.

**[neverthrow](https://www.npmjs.com/package/neverthrow)** — ~1.17M weekly downloads, ~7K stars
- `Result<T,E>` and `ResultAsync<T,E>`. More popular but has no `Maybe` type.

**[denque](https://www.npmjs.com/package/denque)** — Fastest deque implementation, used by MongoDB/Redis/Kafka clients. O(1) all operations. Replaces `Queue`.

**[remeda](https://www.npmjs.com/package/remeda)** — TypeScript-first utility library
- `groupBy`, `uniqBy`, `pipe`, etc. Replaces `List.groupBy()` and `List.distinct()`.

### 9. Utility Functions (objects, strings, Lazy, Once, deadline)

**[remeda](https://www.npmjs.com/package/remeda)** — Covers `isNil`, `isDefined`, and many object/array utilities. Fully tree-shakeable.

**[@std/async](https://jsr.io/@std/async)** — Deno's `deadline()` is a direct replacement for the `deadline` utility.

**[p-timeout](https://www.npmjs.com/package/p-timeout)** — Timeout a promise after a specified duration.

### 10. Error Classification (transient detection, HTTP errors)

**[Cockatiel](https://www.npmjs.com/package/cockatiel)** — Retry policies support `handleWhen` predicates to classify transient vs. permanent errors. Combined with circuit breakers, this provides a complete resilience story.

**[@curveball/http-errors](https://github.com/curveball/http-errors)** — Typed HTTP error classes with proper status codes and headers. Supports RFC 9457 `application/problem+json`.

---

## All-in-One Alternative: Effect

**[Effect](https://effect.website/)** ([GitHub](https://github.com/Effect-TS/effect)) could replace nearly the entire library in a single framework:

- Streams (reactive), Queue, PubSub
- Concurrency primitives (Semaphore, Mutex via Ref)
- Scheduling, retry, resilience
- Typed errors, error classification
- Cancellation (fiber interruption)
- Resource management (Scope)

The trade-off is a steep learning curve and full commitment to the Effect programming model. Best suited for greenfield projects that want a comprehensive, type-safe foundation.
