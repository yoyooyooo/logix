# Data Model: Root Runtime Runner（根模块运行入口）

**Date**: 2025-12-23  
**Spec**: `/Users/yoyo/Documents/code/personal/intent-flow/specs/024-root-runtime-runner/spec.md`

> 本特性不引入业务数据与持久化实体；本文件用于固化“对外上下文对象/退出策略提示/错误分类/释放边界”等可交互对象的结构边界，便于在 `@logix/core` 与 `@logix/test` 之间保持一致语义。

## Entity: ProgramRunContext

代表“一次 program module 运行会话”里脚本作者可用的上下文。

- `scope`: 本次运行的根作用域（CloseableScope）；关闭它会统一 interrupt 模块内常驻监听并执行 finalizer 释放资源。
- `runtime`: 运行容器（用于执行 Effect，管理 Scope 与资源）
- `module`: program module 的 `ModuleRuntime` 实例（用于读取状态、派发 action、订阅变化）
- `$`: program module 形状的 Bound API（脚本侧统一入口）
  - 关键能力：`$.use(module)` 返回 `ModuleHandle`，并自动合并 handle-extend（controller/services 等）

## Lifecycle Invariants（重要）

- `ProgramRunContext` 必须是 **scope-bound**：只在其所属 Scope 存活期间可用，禁止跨 Scope 缓存/复用。
- 释放资源的唯一正确方式是 **关闭 `ctx.scope`**（或 `runProgram` 内部在 `main` 结束后自动关闭 `ctx.scope`）：
  - 会统一 interrupt 模块内常驻监听（如 `onAction`）等后台 fiber，并执行 finalizer 释放资源。
- Scope 关闭后继续使用 `ctx.module / ctx.$` 的行为未定义，调用方应视为错误并避免发生。
- 当 finalizer 卡住导致关闭 scope 无法在 `closeScopeTimeout` 内完成时，runner 必须以 DisposeTimeout 失败并提供可序列化提示（同时通过 `RuntimeOptions.onError` 发出告警），避免“无解释悬挂”。

## Entity: RunProgramOptions

代表“运行入口”的可选配置（不绑定具体实现字段名）。

- `runtime`（等同于 `RuntimeOptions` 本体）：透传给 Runtime 构造的配置（如顶层 layer、错误上报钩子、label 等）
- `closeScopeTimeout`: 关闭 `ctx.scope` 的超时窗口（毫秒，默认 1000）。仅用于在 “finalizer 卡住” 场景下可解释地失败；不代表 runner 会“自动推断退出时机”。
- `handleSignals`: 是否在 Node.js 场景捕获 SIGINT/SIGTERM 触发 graceful shutdown（默认 true）。信号到达时不得 `process.exit`，而是关闭 `ctx.scope` 让 finalizer 有机会执行。
- `args`: 注入给 `main(ctx, args)` 的结构化参数（typed args），避免直接读取 `process.argv` 等全局状态造成不可测。
- `exitCode`（可选，CLI mode）：启用后允许将 `main` 的成功结果 `void | number` 映射为 `process.exitCode`；失败路径默认映射为非 0（默认 1），并通过错误分类/提示字段保持可解释。
- `reportError`（可选，CLI mode）：是否由 runner 负责做默认错误输出（默认 true）。当为 false 时，不做默认输出；调用方可完全通过 `RuntimeOptions.onError` 或外层捕获处理。

## Entity: RunProgramOutcome（可选）

表示一次运行的结果摘要（用于测试对齐与诊断）。

- `result`: 主流程成功结果（若成功）
- `failureCategory`: 启动失败 / 主流程失败 / 释放失败（含 DisposeTimeout）（若失败）
- `diagnosticHint`: 可序列化的提示信息（例如 entrypoint、缺失提供者的 tokenId、退出策略提示字段、timeoutMs 等）

## Error Taxonomy（行为级）

runner 对外应能让调用方区分以下类别（不强制新增 Error 类型，但行为上要可区分）：

- **BootError**：program module 启动/装配失败（缺失依赖、Layer 构建失败、tag 无法解析等）
- **MainError**：主流程失败（业务错误或 defect）
- **DisposeTimeout**：关闭 `ctx.scope` 超时（典型原因：finalizer 卡住/不可中断 IO/后台 fiber 未被正确收束）。
  - 注意：runner 不引入“退出策略失败”的独立类别；退出策略问题通过错误中的“提示字段”体现（例如 main 未等待退出条件、或外部信号组合超时）。
