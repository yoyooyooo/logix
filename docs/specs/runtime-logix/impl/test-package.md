# @logix/test Specification

> [!NOTE]
> This specification defines the `@logix/test` package, designed to provide "Pure Effect Testing" utilities for Logix v3. It rejects imperative Jest-style APIs in favor of an Effect-native approach.

## 1. Overview

`@logix/test` provides a specialized runtime and fluent testing API for Logix modules. It treats tests as `Effect` programs, allowing developers to control time, mock services, and assert states using standard Effect patterns.

## 2. Package Structure

```
packages/logix-test/
├── src/
│   ├── index.ts                # Public API (defineTest, runTest, Scenario)
│   │
│   ├── runtime/
│   │   └── TestRuntime.ts      # Specialized Runtime with TestClock/TestServices
│   │
│   ├── api/
│   │   ├── defineTest.ts       # Core testing API
│   │   └── Scenario.ts         # Builder for integration tests
│   │
│   └── utils/
│       └── assertions.ts       # Effect-based assertions
│
├── package.json
├── tsconfig.json
└── tsup.config.ts
```

## 3. Core APIs

### 3.1 `defineTest` & `runTest`

The core testing primitive. `defineTest` creates a test Effect, and `runTest` executes it.

- `defineTest(Module, (api) => Effect)`: Defines a test scenario.
- `runTest(effect, options?)`: Executes the test Effect.
  - Returns `Promise<ExecutionResult>` containing traces and logs (useful for platform debugging).
  - Supports custom `Layer` injection via options.

```typescript
import { defineTest, runTest } from "@logix/test"
import { TestClock } from "effect/Test"

const myTest = defineTest(CounterModule, (api) => Effect.gen(function*() {
  // ... test logic
}))

// Run with custom environment (e.g., for platform sandboxing)
const result = await runTest(myTest, {
  layers: [
    // Replace real Fetch with Sandbox Fetch
    Layer.succeed(FetchHttpClient.Fetch, sandboxFetch)
  ]
})

// result.trace can be used for AI analysis or visualization
console.log(result.trace)
```

### 3.2 Test API Capabilities

The `api` object provided in `defineTest` exposes the following capabilities:

```typescript
interface TestApi<State, Actions> {
  // Dispatch an action to the module under test
  dispatch(action: Action): Effect<void>

  // Assertions (auto-retrying)
  assert: {
    // Assert state matches a predicate
    state(predicate: (s: State) => boolean): Effect<void>

    // Assert a specific signal was emitted
    signal(type: string, payload?: unknown): Effect<void>

    // Assert a service method was called n times
    serviceCalls(tag: Context.Tag<any, any>, times: number): Effect<void>
  }
}
```

### 3.3 `Scenario` (Integration Builder)

A builder pattern that constructs a test Effect for complex multi-module scenarios. It returns an `Effect`, maintaining purity.

```typescript
import { Scenario } from "@logix/test"

const complexTest = Scenario.make()
  .provide(UserModule, AuthModule)
  // Inject platform-specific services (Database, API Clients)
  .layer(Layer.succeed(DatabaseTag, mockDb))
  .arrange({
    [UserModule.id]: { name: "Alice" }
  })
  .act(($) =>
    // Returns an Effect directly
    $.dispatch(AuthModule.actions.login("alice", "password"))
  )
  .assert(($) =>
    // Returns an Effect directly
    $.assert.state(UserModule, s => s.isAuthenticated)
  )
  .build() // Returns Effect<void, TestError, TestEnv>

it("should handle complex flow", () => runTest(complexTest))
```

### 3.4 `TestRuntime`

Internally used by `runTest` to provide a `TestContext` where:
- `Clock` is replaced by `TestClock`.
- `Random` is deterministic.
- Services can be mocked via Layers.

## 4. Dependencies

- `logix-core`: The runtime being tested.
- `effect`: For `TestContext`, `TestClock`, `Layer`, etc.
- **No hard dependency on Vitest/Jest**. Adapters can be added in separate packages (e.g., `@logix/test-vitest`) or just used as runners.

## 5. Key Features

- **Pure Effect**: Tests are just Effects. Compose them, retry them, race them.
- **Time Travel**: Native integration with `TestClock`.
- **Auto-Retry Assertions**: `api.assert.state` retries until the condition is met or times out, handling async state updates naturally.
- **Platform Ready**:
  - **Full DI Support**: Inject any Effect Layer (Database, Network, FS) to mock backend environments.
  - **Execution Tracing**: `runTest` returns structured logs and traces, enabling "n8n-style" visual debugging and AI analysis.
