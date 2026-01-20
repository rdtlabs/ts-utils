# Copilot Instructions for @rdtlabs/ts-utils

## Project Overview

TypeScript utility library for Deno, published on JSR. Provides async coordination primitives (Go/Java/C# inspired), C#-style cancellation tokens, reactive streams, buffers, and crypto helpers.

## Module Architecture

Organized as **submodules** exported via `deno.jsonc` exports map:
- `/async` - Synchronization primitives (`Mutex`, `Semaphore`, `WaitGroup`, `Signal`, `Monitor`), task execution (`WorkerPool`, `JobPool`), reactive streams (`FlowPublisher`, `FlowProcessor`), and adapters (`fromEvent`, `fromObservable`)
- `/cancellation` - C# CancellationToken pattern with `CancellationController`, integrates with `AbortSignal` via `toAbortSignal()`
- `/buffer` - Push-to-pull adaptation with `BufferStrategy` (drop/keep latest/throw/keep all)
- `/crypto` - Web Crypto API wrappers
- `/encoding` - Base64/hex utilities
- `/errors` - Transient error detection
- Root export (`/`) - Common utilities (`Maybe`, `Lazy`, `Queue`, `List`, `objects`, `strings`, etc.)

## Critical Patterns

### Flowable Reactive Streams
Found in [src/async/flowable/](../src/async/flowable/):
- `FlowPublisher<T>` - Source with chainable operators: `filter`, `map`, `compose`, `peek`, `chunk`, `skipUntil`, `takeWhile`, `resumeOnError`
- `FlowProcessor<S,T>` - Transform pipeline connecting to publishers
- Built on `Pipeable` abstraction ([src/async/pipeable/](../src/async/pipeable/))

Example: [src/async/flowable/FlowPublisher.ts](../src/async/flowable/FlowPublisher.ts)

### Cancellation Token Pattern
Modeled after C# (see [src/cancellation/CancellationToken.ts](../src/cancellation/CancellationToken.ts)):
- Token states: `"active"`, `"cancelled"`, `"none"` (discriminated union)
- Create via `CancellationToken.create()` returning `CancellationController`
- Register callbacks with `token.register()` → returns `Unregister` function
- Use `cancellablePromise`/`cancellableIterable` to wrap operations
- Convert to `AbortSignal` via `toAbortSignal()` for fetch/DOM APIs

### Resource Management
Use native disposables with custom `Disposer` utility ([src/disposer.ts](../src/disposer.ts)):
- `Disposer.from()` - Sync disposal
- `Disposer.fromAsync()` - Async disposal
- Returns callable that aggregates disposal errors
- All cleanup functions collect errors without throwing

### Maybe Type
Functional option type ([src/Maybe.ts](../src/Maybe.ts)) with monadic operations:
- `else(alt)`, `elseGet(fn)`, `elseThrow(errFn)`
- `map`, `flatMap`, `filter`, `or`
- Implements `Iterator` for destructuring: `for (const val of maybe)`

## Development Workflow

```bash
# Run tests (uses Deno's built-in test runner)
deno test src/                     # All tests
deno test src/path/to/file.test.ts # Single file

# Code quality
deno lint                          # Lint
deno fmt                           # Format
deno check                         # Type check
```

### Test Conventions
- Co-located: `*.test.ts` alongside source files
- Use `Deno.test()` with descriptive names: `Deno.test("Mutex tryLock/unlock test", ...)`
- Import assertions from `@std/assert`: `assert`, `assertFalse`, `assertEquals`, etc.
- Async primitives tested with `WaitGroup` and `Signal` for coordination
- See [src/async/Mutex.test.ts](../src/async/Mutex.test.ts) for examples

## Type Conventions

- Interfaces for public contracts (e.g., `CancellationToken`, `FlowPublisher`)
- Type aliases for complex unions (`Maybe<T>`, `Disposer`)
- Discriminated unions for state: See `CancellationToken.state` (active/cancelled/none)
- `@module` JSDoc tags for module-level documentation

## Publishing

Published on JSR (not npm). Entry points defined in `deno.jsonc` exports. Test files excluded via `publish.exclude` pattern.

## Key Files

- [deno.jsonc](../deno.jsonc) - Exports, tasks, lint/format config
- [src/async/index.ts](../src/async/index.ts) - Async primitives barrel export
- [src/cancellation/index.ts](../src/cancellation/index.ts) - Cancellation exports
- [CLAUDE.md](../CLAUDE.md) - Extended development guide
