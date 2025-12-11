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

`TestProgram.run` 提供的 `api` 对象（以主模块为视角）当前具备：

```ts
interface TestApi<Sh extends Logix.AnyModuleShape> {
  dispatch(action: Logix.ActionOf<Sh>): Effect.Effect<void>
  assert: {
    state(
      predicate: (s: Logix.StateOf<Sh>) => boolean,
      options?: WaitUntilOptions,
    ): Effect.Effect<void, Error, unknown>
    signal(
      expectedType: string,
      expectedPayload?: unknown,
      options?: WaitUntilOptions,
    ): Effect.Effect<void, Error, unknown>
  }
}

interface WaitUntilOptions {
  readonly maxAttempts?: number
  readonly step?: DurationInput
}
```

实现约定：

- `assert.state` 与 `assert.signal` 均依赖 `TestClock` 与内部的 `waitUntil` 工具自动重试；
- 默认最多重试约 `20` 次，每次推进虚拟时钟（默认步长 `10 millis`）并 `yieldNow`；
- 调用方可以通过 `WaitUntilOptions` 调整最大重试次数与步长，用于适配更慢的异步场景。

> [!NOTE]
> 规格中预留的 `assert.serviceCalls(...)` 能力仍在规划中，当前实现尚未提供；后续如需落地会优先在本文件补充。

### 3.3 `ExecutionResult` & `Execution` Helpers

`ExecutionResult` 作为场景运行的统一结果结构，包含：

- `state`：主模块最终 State；
- `actions`：按时间顺序收集到的 Action 序列；
- `trace`：包含 State / Action / Error 的详细时序事件。

围绕该结果，`Execution` 命名空间目前提供：

- 查询工具：
  - `Execution.hasAction(result, predicate)`；
  - `Execution.getActionsByTag(result, tag)`；
  - `Execution.hasError(result)` / `Execution.getErrors(result)`。
- 抛错式断言工具：
  - `Execution.expectActionTag(result, tag, { times? })`；
  - `Execution.expectNoError(result)`；
  - `Execution.expectNoActionTag(result, tag)`：断言某个 tag 的 Action 不存在；
  - `Execution.expectActionSequence(result, [tag1, tag2, ...])`：按顺序断言完整的 Action tag 序列。

这些 helper 主要面向「集成测试 + 调试」场景，用于替代松散的 `expect(...).toEqual(...)`，也为未来的 DevTools / AI 分析提供结构化入口。

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
