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

### 3.1 `TestProgram` & `runTest`

The recommended entrypoint. `TestProgram.make` builds a test scenario from a
declarative config, and `runTest` executes the resulting Effect.

- `TestProgram.make(config)`: Defines a test scenario (single or multi-module).
- `scenario.run((api) => Effect)`: Provides a `TestApi` for dispatch / assertions.
- `runTest(effect)`: Executes the test Effect.
  - Returns `Promise<ExecutionResult>` containing traces and logs (useful for platform debugging).

```typescript
import { TestProgram, runTest } from "@logix/test"

const scenario = TestProgram.make({
  main: {
    module: CounterModule,
    initial: { count: 0 },
    logics: [CounterLogic],
  },
  modules: [
    {
      module: AuthModule,
      initial: { loggedIn: false },
      logics: [AuthLogic],
    },
  ],
  layers: [
    LinkLayer, // e.g. Link.make({ modules: [UserModule, AuthModule] }, ($) => Effect)
  ],
})

const testEffect = scenario.run(($) =>
  Effect.gen(function* () {
    yield* $.dispatch({ _tag: "increment", payload: undefined })
    yield* $.assert.state((s) => s.count === 1)
  })
)

const result = await runTest(testEffect)
console.log(result.trace)
```

> [!NOTE]
> `defineTest` 仍然保留作为底层 API，适用于简单单模块场景或需要直接控制 Layer 注入的情况。

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

### 3.3 `TestRuntime`

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
