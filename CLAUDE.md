# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

@rdtlabs/ts-utils is a TypeScript utility library providing async primitives, cancellation patterns, buffers, and crypto helpers. It is published on JSR for Deno.

## Development Commands

```bash
# Run all tests
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

## Architecture

### Module Structure

The library is organized into submodules, each exported via `deno.jsonc`:

- **`/async`** - Async coordination primitives (Go/Java/C# inspired)
- **`/buffer`** - Buffer strategies for push-to-pull adaptation
- **`/cancellation`** - C#-style cancellation token pattern
- **`/crypto`** - Web Crypto API encryption helpers
- **`/encoding`** - Base64 and hex encoding utilities
- **`/errors`** - Transient error detection utilities
- **Root export** - Common utilities (objects, strings, deadline, Queue, List, Maybe, etc.)

### Key Patterns

**Flowable System** (`src/async/flowable/`): A reactive streams implementation with:
- `FlowPublisher<T>` - Source of async values with chainable operators (filter, map, compose, peek, etc.)
- `FlowProcessor<S,T>` - Transform pipeline that connects to publishers
- Built on `Pipeable` abstraction (`src/async/pipeable/`) for composable transformations

**Cancellation Pattern** (`src/cancellation/`): Modeled after C# CancellationToken:
- `CancellationToken` - Token with states: active, cancelled, none
- `CancellationController` - Creates and manages tokens
- Integrates with AbortSignal via `toAbortSignal()`
- Use `cancellablePromise`/`cancellableIterable` to wrap operations

**Buffer Strategies** (`src/buffer/`): Adapts unbounded push sources to pull-based iteration:
- `BufferStrategy` enum controls overflow: drop, keep latest, throw, keep all
- Used internally by `fromEvent`, `fromObservable`, etc.

**Async Primitives** (`src/async/`):
- Synchronization: `Mutex`, `Semaphore`, `WaitGroup`, `Signal`, `Monitor`
- Task execution: `WorkerPool`, `JobPool`, `executor`, `executors`
- Adapters: `fromEvent`, `fromObservable`, `fromAsyncIterable`, `fromIterableLike`
