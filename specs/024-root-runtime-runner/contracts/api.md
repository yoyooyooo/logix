# Contract: Root Runtime Runner API

**Date**: 2025-12-23  
**Feature**: `/Users/yoyo/Documents/code/personal/intent-flow/specs/024-root-runtime-runner/spec.md`

> 本文件定义对外 API 与行为契约（以 `@logixjs/core` 为主事实源），用于后续实现与测试对齐。具体函数命名可在实现阶段微调，但必须满足下述语义。
>
> **裁决**：对外“一次性运行入口”采用 `runProgram` 命名，以强调它运行的是“root module + mainFn”构成的程序，而不是仅做 boot。

## Terminology

- **Root module / Program module**：作为“可运行程序”的根模块实现；运行时会将其作为 runtime 树入口（root）进行装配与启动。
- **Program runner**：`@logixjs/core` 的标准入口（`Runtime.runProgram` / `Runtime.openProgram`），负责 boot 与释放，不提供隐式保活。
- **Boot**：触发 root module 实例化与启动（包含 logics 初始化与 run fibers/processes 启动）。
- **Main program**：调用方提供的主流程；它显式表达退出条件（等待观测/外部信号/或直接结束）。
- **Isolation（隔离）**：不同 root 实例在同一进程内运行时，至少在 Scope/instanceId/注册表/状态 上相互隔离；不得依赖或静默回退到进程级全局单例解析。

## Public API (core)

### `Runtime.runProgram(module, main, options?)`

**Purpose**: demo/脚本/命令行场景的一次性入口，自动管理“启动 → 执行 → 释放”。

**Inputs**:

- `module`：可运行的 program module（等价于当前 `Runtime.make` 能接受的 root 形态）
- `main(ctx, args)`：主流程函数，接收上下文与参数并返回一个 Effect（或等价可运行程序）
- `options?`：运行时配置（透传给 runtime 构造，并补充 runner 行为配置）
  - MUST 透传 `RuntimeOptions.onError`：允许脚本/CLI 自定义顶级错误上报（例如写入文件/监控），而不是只能依赖控制台。
  - `closeScopeTimeout`：关闭 `ctx.scope` 的超时窗口（毫秒，默认 1000）；用于在 finalizer 卡住时“可解释地失败”，避免无限悬挂。
  - `handleSignals`：是否在 Node.js 下捕获 SIGINT/SIGTERM 触发 graceful shutdown（默认 true）；不得在信号到达时调用 `process.exit`，只负责关闭 `ctx.scope` 并让程序自然退出（受 `closeScopeTimeout` 约束）。
  - `args`：注入给 `main` 的结构化参数（typed args），避免直接读取 `process.argv` 等全局状态造成不可测与漂移。
    - MVP 约束：runner 只负责注入与透传，不负责解析/校验 args；如需校验，调用方应在 `main` 内显式使用 `effect/Schema` 或等价机制完成（后续如需“argsSchema 自动校验”应单独立项）。
  - `exitCode`（可选，CLI mode）：启用后，允许 `main` 在成功通道返回 `void | number` 并映射为 `process.exitCode`；失败路径默认映射为非 0（默认 1），并允许通过 `RuntimeOptions.onError` 与错误载荷解释原因。
  - `reportError`（可选，CLI mode）：是否由 runner 负责做默认错误输出（默认 true）。当为 false 时，runner 仍会返回失败，但不做默认输出；调用方可完全通过 `RuntimeOptions.onError` 或外层捕获处理。

**Context (`ctx`)**:

- `ctx.scope`：本次运行的根作用域（CloseableScope）；runner 会在主流程结束后关闭该 scope。
- `ctx.runtime`：运行容器（ManagedRuntime）
- `ctx.module`：program module 的 `ModuleRuntime`
- `ctx.$`：module shape 的 Bound API（必须支持 `$.use(module)` 并合并 handle-extend）

**Behavior**:

1. MUST 构造一个新的 runtime（与当前 `Runtime.make` 等价的装配语义），并保持 strict by default（不得依赖/静默回退到进程级全局解析 fallback）。
2. MUST 在进入 `main` 前完成 boot（至少触碰一次 program module 的 tag，保证实例化与 logics/processes 启动）。
3. MUST 执行 `main(ctx, args)`，并将其结果/失败传播给调用方；退出条件由 `main` 显式表达（可等待外部信号或观测条件），runner 不做隐式保活或自动推断退出时机。
4. MUST 在成功/失败两种情况下释放资源（关闭 `ctx.scope` / dispose runtime），不得遗留后台 fiber 导致脚本悬挂。
   - MUST 支持 `closeScopeTimeout`（默认 1 秒 / 1000ms）：若关闭 scope 超时，则以 DisposeTimeout 失败，并通过 `RuntimeOptions.onError` 发出告警（不改变退出策略）。
5. SHOULD 支持 `handleSignals`：当 SIGINT/SIGTERM 到达时触发关闭 `ctx.scope`（graceful shutdown），并在结束后移除监听器，避免泄漏与串扰。
6. MUST 保持 `RuntimeOptions.onError` 的语义一致：对未捕获 defect 的上报仅用于诊断，不应改变退出策略的默认行为。
7. MUST 支持同一进程内并行运行多个 root 实例且相互隔离（Scope/instanceId/注册表/状态）；不得通过 process-global registry “兜底解析”来定位模块实例。
8. MUST 不引入事务边界越界：runner 自身不在事务窗口执行 IO/async，也不新增业务可写逃逸通道。

**Error semantics**:

- 启动失败（BootError）、主流程失败（MainError）与释放失败/超时（DisposeError/DisposeTimeout）必须可区分（可通过错误对象字段/名称/entrypoint 提示等方式实现），并提供可行动的修复提示（例如缺失 provider、finalizer 卡住）。
- 对 `DisposeTimeout`：错误载荷必须包含至少一条**可行动建议**，用于排查“为何脚本无法退出”（例如：检查是否存在未 unregister 的 event listener、未 join/未 interrupt 的 fiber、或未正确关闭的资源句柄）。
- 错误载荷 MUST Slim 且可序列化；并至少可关联 `moduleId + instanceId`（不得默认使用随机/时间作为 identity 锚点）。
- 错误对象 MUST 提供退出策略相关提示字段（字符串/枚举均可；命名可变），用于帮助调用方判断是否涉及退出策略问题。

### `Runtime.openProgram(module, options?)`

**Purpose**: 资源化入口，适用于交互式 runner / 多段程序复用同一棵 runtime。

**Behavior**:

- 返回一个 scope-bound 的 `ProgramRunContext`（等同于 `runProgram` 的 `ctx`，包含 `ctx.scope`）。
- 上下文的生命周期必须受 Scope 管理；Scope 关闭时必须释放 runtime 资源。
- MUST 在返回 `ProgramRunContext` 前完成 boot（至少触碰一次 program module 的 tag，确保实例化与 logics/processes 已启动），保证调用方拿到 `ctx` 后可立即执行交互式流程而无需额外“预热”。
- MUST 透传 `RuntimeOptions.onError`（与 `runProgram` 一致）。
- MUST 支持同一进程内并行 `openProgram` 多个 root 实例且相互隔离；不得引入/依赖 process-global fallback。

## Alignment API (test)

> 本节固化 `@logixjs/test` 的最小对外表面积，用于仓库迁移与心智模型收敛。

### `TestProgram.runProgram(programModule, body, options?)`

**Purpose**: 测试入口（受控 host）：复用 core runner 的生命周期内核，提供 TestApi 与 ExecutionResult 收集。

**Inputs**:

- `programModule`：program module（必须有 `.impl`；推荐通过 `ModuleDef.implement({ initial, logics, imports, processes })` 构造）
- `body(api)`：测试主流程（显式表达退出条件；成功/失败都会触发释放收束）
- `options?`：透传 runner 所需的最小配置：
  - MUST 透传 `RuntimeOptions`（尤其 `layer/onError`）
  - MAY 暴露 `closeScopeTimeout`（避免 finalizer 卡住导致测试悬挂；语义与 core runner 一致）
  - MUST 不支持也不模拟 Node-only CLI 行为（`handleSignals/exitCode/reportError`）；如需这些能力，直接使用 `Runtime.runProgram`

**Behavior**:

1. MUST 复用 `Runtime.openProgram/runProgram`（或其内部 ProgramRunner）完成 boot/释放；`@logixjs/test` 不得自建 Scope/boot/释放逻辑。
2. MUST 在一次运行内收集 `ExecutionResult`（state/actions/trace），并保证可序列化与可解释。
3. MUST 提供 `TestApi`：
   - `api.ctx.$` 可用于 `$.use(module)` 与 handle-extend（与脚本/React 一致）
   - `api.dispatch` 与 `api.assert.*`（以及可控时钟能力）仅作为测试附加能力，不得改变被测行为（除显式启用 TestClock 等能力）

### `vitest.itProgram` / `itProgramResult`

- 作为 Vitest 语法糖封装 `TestProgram.runProgram` + `runTest`：
  - `itProgram`：默认断言无错误（等价于当前 `Execution.expectNoError`）
  - `itProgramResult`：暴露 `ExecutionResult` 供调用方自定义断言

### Deleted legacy surface (no compatibility)

- 删除：`TestProgram.make(config)`、`ScenarioConfig`、`Scenario`、`ScenarioBuilder`
- 删除：`itScenario`、`itScenarioResult`
- 删除：`Scenario.ts`、`runtime/TestRuntime.ts`、以及 `_op_layer` 分类 hack

### Alignment guarantees（行为级）

- 测试 runner 的“启动/退出/释放”语义必须与 `Runtime.runProgram/openProgram` 一致。
- 对齐点必须是 core runner（而不是复制装配/释放逻辑）；当 runner 契约调整时，`@logixjs/test` 必须随之同步（以迁移说明替代兼容层）。

## Non-goals

- 不提供“自动推断退出时机”的隐式策略；退出必须由调用方在 `main(ctx, args)` 中显式表达或组合。
- 不新增也不依赖“进程级全局解析”与隐藏 fallback；严格依赖 Effect Context/scope 语义。
- 不引入默认随机/时间 identity：不得让 runner 成为“随机 instanceId/随机会话”的来源。
- 不在本特性内提供 CLI 参数（`args`）的自动解析/Schema 校验能力；runner 只透传 args，校验由调用方显式实现或后续单独立项。

## Related

- 025（IR Reflection Loader）会把本 API 的 **program module** 作为首个载体：在 CI/平台侧对同一个入口导出 `ModuleManifest/StaticIR/TrialRunReport` 工件（可 diff），用于契约防腐与平台消费。
