# `@logix/test`（运行时对齐版）规范

> 目标：提供「测试即 Effect」的工具集，但 **生命周期语义必须与 `@logix/core` 的 Program Runner 一致**。  
> 关键裁决：不再维护独立的 `Scenario/TestRuntime/TestProgram.make` 生命周期模型；统一以 **program module** 为输入复用 `Runtime.openProgram/runProgram` 内核。

## 1. Overview

`@logix/test` 的职责是：

- 在不改变业务语义的前提下，为测试叠加：
  - Trace（actions/state/lifecycle:error）收集；
  - 断言工具（含自动重试）；
  - TestClock（虚拟时间推进）。
- 其 boot/释放语义必须与 demo/脚本入口一致，避免两套模型漂移。

## 2. Package Structure（当前裁决）

```
packages/logix-test/
├── src/
│   ├── index.ts
│   ├── api/
│   │   ├── defineTest.ts        # runTest：提供 TestContext + scope 管理
│   │   ├── TestApi.ts           # TestApi：ctx/dispatch/assert/advance
│   │   └── TestProgram.ts       # runProgram(programModule, body, options?)
│   ├── ExecutionResult.ts       # ExecutionResult / TraceEvent + helper 断言
│   ├── utils/
│   │   ├── assertions.ts
│   │   └── waitUntil.ts
│   └── vitest.ts                # itProgram / itProgramResult 语法糖
└── test/
```

## 3. Core APIs

### 3.1 `TestProgram.runProgram(programModule, body, options?)`

- 输入：**program module**（`ModuleDef.implement(...)` 的产物，含 imports/processes/layer）；
- 内核：复用 `@logix/core` 的 `Runtime.openProgram`（boot + dispose 语义一致）；
- 附加：在一次运行内收集 trace，并提供 `TestApi`：
  - `api.ctx`：`ProgramRunContext`（含 `ctx.$`，可在测试里像 Logic 一样 `$.use(OtherModule)`）
  - `api.dispatch`：对主模块派发 action
  - `api.assert.state / api.assert.signal`：基于 `waitUntil` 的自动重试断言
  - `api.advance`：推进 TestClock（用于 `Effect.sleep` / `Schedule.addDelay` 场景）
- service mock：通过 `options.layer`（透传给 core Runtime）注入，不再通过 `_op_layer` 分类 hack。

### 3.2 `runTest(effect)`

`runTest` 是 runner 的最底层执行入口：

- 为测试 Effect 提供 `TestContext`；
- 同时确保 `Scope` 生命周期可控（避免“服务缺失”或资源泄漏）。

### 3.3 Vitest helpers：`itProgram` / `itProgramResult`

- `itProgram`：默认执行 `Execution.expectNoError(result)`；
- `itProgramResult`：暴露 `ExecutionResult` 交由调用方断言（用于期望出现特定 trace/diagnostic 的场景）。

## 4. Migration patterns（旧 → 新）

### 4.1 单模块

- 旧：`TestProgram.make({ main: { module, initial, logics } }).run(body)`
- 新：`TestProgram.runProgram(module.implement({ initial, logics }), body)`

### 4.2 多模块 / Link / 长期流程

- 旧：`modules: [...] + layers: [Layer.scopedDiscard(LinkLogic)]`（或依赖 `_op_layer` 推断 process layer）
- 新：
  - 协作模块实现体放到 `program.implement({ imports: [Other.impl] })`
  - 长期流程放到 `program.implement({ processes: [Link.make(...)] })`
  - service mock 通过 `options.layer` 注入

## 5. ExecutionResult（Trace 语义）

`ExecutionResult` 作为统一结果结构：

- `state`：主模块最终 State；
- `actions`：按时间顺序收集到的主模块 Action 序列；
- `trace`：Action / State / Error（lifecycle:error）事件序列。

围绕该结果，`Execution` 命名空间提供常用断言 helper（如 `expectActionTag` / `expectNoError`）。
