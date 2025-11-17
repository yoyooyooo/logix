# Research: Root Runtime Runner（根模块运行入口）

**Date**: 2025-12-23  
**Spec**: `/Users/yoyo/Documents/code/personal/intent-flow/specs/024-root-runtime-runner/spec.md`

## 背景与问题

当前仓库在 Node 脚本/demo 中运行 root module 的常见写法是“手动挡”：

- 显式创建 runtime（`Runtime.make(...)`）
- 通过触碰 `Root.tag` 触发实例化与逻辑启动（否则 logics/processes 可能未启动）
- 用 `Deferred.await(done)` 之类方式把“退出条件”绑定到主流程，避免脚本提前结束或提前 `dispose`
- `finally runtime.dispose()` 防泄漏

该写法能工作，但有两类明显问题：

1. **入侵性与样板**：为了“跑起来/不退出”，不得不引入 Host/Deferred 模式，示例可读性与可交接性下降。
2. **能力不对齐**：脚本侧若直接 `yield* Module.tag` 只能拿到 `ModuleRuntime`，无法自然获得 `$.use(module)` 才会合并的 handle-extend（controller 等）扩展；导致 demo 与业务侧心智模型割裂。

## Decision 1：root runner 属于 `@logix/core`

**Decision**: 提供标准化 root runner 作为 `@logix/core` 的公共能力。  
**Rationale**:

- 这是生产场景能力（脚本/CLI/demo/平台试运行）而非测试专属；不应要求业务侧依赖 `@logix/test`。
- `@logix/test` 更适合在 core 能力之上叠加测试专用能力（观测、断言、可控时钟），保持职责单一。

**Alternatives considered**:

- 仅放在 `@logix/test`：会迫使 demo/脚本依赖测试包，且无法作为平台/真实业务工具链入口，拒绝。

## Decision 2：提供“两层入口”（资源化 + 一次性）

**Decision**: API 形态分为两层：

- **资源化入口**：用于长期持有同一个 root runtime（多段 program、交互式 runner）。
- **一次性入口**：用于 demo/脚本，封装“启动 → 执行主流程 → 释放”样板。

**Rationale**:

- 资源化入口能表达“运行上下文生命周期”这一事实（Scope-bound），更贴合 Effect 语义。
- 一次性入口能最大化减少样板，覆盖最常见的 demo/CLI 使用方式。

**Alternatives considered**:

- 只提供一次性入口：会逼迫复杂场景重复创建 runtime，或自行管理 Scope，仍会长出变体。
- 只提供资源化入口：对 demo/CLI 仍然太重，无法替代现有手动挡样板。

## Decision 3：脚本侧必须拿到 `$`（Bound API）以复用 handle-extend

**Decision**: root runner 返回的上下文必须包含一个 root 形状的 `$`（Bound API）。

**Rationale**:

- handle-extend（`Symbol.for("logix.module.handle.extend")`）当前只在 `$.use(...)`（以及 React 的 `useModule`）路径上统一合并。
- 脚本侧如果只暴露 `ModuleRuntime`（例如 `yield* Root.tag`），将无法自然获得 controller/services 等扩展，破坏“同一套入口语义”的目标。

**Alternatives considered**:

- 新增 `ModuleHandle.fromRuntime(...)`：会引入第二套入口与重复逻辑，并可能带来扩展合并漂移，拒绝。
- 在 `ModuleRuntime` 上挂扩展：会把“只读句柄”与“实例能力”混淆，并扩大可写表面，拒绝。

## Decision 4：boot 语义 = “触碰 root tag 一次”

**Decision**: root runner 在进入主流程前应保证 root 已完成实例化启动（至少触碰一次 root tag）。  
**Rationale**:

- 仓库现状中，模块逻辑与 processes 的启动与 ModuleRuntime 构造绑定；不触碰 root tag 可能导致“看似 run 了 program，但后台逻辑未启动”。

**Alternatives considered**:

- 依赖调用方在主流程里自己触碰：继续把样板暴露给调用方，拒绝。

## Decision 5：退出策略不自动推断（显式表达）

**Decision**: runner 负责启动/释放；退出策略由调用方显式表达（主流程结束/外部信号/观测条件）。  
**Rationale**:

- 常驻逻辑（监听 actions/state/平台信号）不会自然结束，自动推断退出会引入不可解释的隐式规则与 bug。

**Alternatives considered**:

- “当没有活跃 fiber 时自动退出”：会与 Effect 的 scope/fork 语义冲突且不可预测，拒绝。

## Decision 6：以新视角审视并对齐 `@logix/test`

**Decision**: `@logix/test` 的 runner 语义以本特性的 root runner 为基线对齐；若早期设定冲突，允许推翻并迁移。  
**Rationale**:

- 测试与 demo 若在启动/释放/作用域上语义不一致，会制造长期误判与维护成本。

**Alternatives considered**:

- 保持测试 runner 自成体系：会继续漂移；尤其在“imports-scope/Root.resolve/handle-extend”这些语义上，容易与生产路径产生差异，拒绝。
