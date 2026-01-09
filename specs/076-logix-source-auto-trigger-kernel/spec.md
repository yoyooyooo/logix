# Feature Specification: Source Auto-Trigger Kernel（基于 dirtyPaths+deps 的受限控制律）

**Feature Branch**: `076-logix-source-auto-trigger-kernel`  
**Created**: 2026-01-05  
**Status**: Draft  
**Input**: 073 完成后的新视角（tick=观测参考系）+ 当前 Query/Form 的 source 触发胶水痛点（反射式解释 triggers）。

**Model (SSoT)**: `docs/specs/sdd-platform/ssot/foundation/01-the-one.md`（把 source auto-trigger 视为受限 `Π_source`）。

## Context

当前仓库里，“source 自动刷新”的语义处于一个尴尬的夹层：

- `StateTrait.source` 的声明是 **静态绑定事实**（resource + deps + key + concurrency），但 Query/Form 仍需要在 Logic 层写大量 wiring：
  - `packages/logix-query/src/internal/logics/auto-trigger.ts`：监听 Action（`setParams/setUi`）→ 计算 keyHash → debounce → 决定是否 `$.traits.source.refresh(...)`。
  - `packages/logix-core/src/internal/trait-lifecycle/index.ts#makeSourceWiring`：运行时反查 traits entries（`meta.triggers/meta.deps`）→ onStart + refreshOnKeyChange（线性扫描）。
- 结果是 “把动态流程写死在静态 meta 里，然后再反射式地解释它”：
  - 动态能力被困在 `onMount/onKeyChange/debounceMs` 这种不完整的集合里；
  - 一旦需要更真实的时序（例如 onMount 后 delay 3s，再 refresh），就只能退回 `$.logic` 手写 watcher；
  - runtime 与 Devtools 看到的是“散落的 watcher/计时器”，而不是一个可解释、可回放、可预算的内核语义。

从 073 的视角（tick=观测参考系）来看，这类 wiring 最大的问题是：它会引入 **影子控制律/影子时间线**，让 “事件 → 操作 → 状态” 的因果链很难在 tickSeq/txnSeq/opSeq 上闭合。

## The One（映射到系统方程）

我们把 source 自动刷新视为一种 **受限控制律**（不是自由工作流）：

```text
Π_source : (mount + dirtyPaths_t, S_t, t) -> Ops_t
```

- 它只做一件事：在“deps 可能影响 key”的情况下触发 `source.refresh(fieldPath)`；
- 它的可表达性必须受限（避免把通用 Flow 重新塞回 trait meta）；
- 但它必须被内核化：可 IR 化、可诊断、可预算、可回放，并对齐 tick 参考系。

## Goals / Scope

### In Scope

- 为 `StateTrait.source` 提供 **内核级自动触发**（Source Auto-Trigger Kernel）：
  - onMount：模块启动后触发一次（可配置关闭）；
  - onDepsChange：deps 变化后触发（可配置关闭）；
  - debounce：作为受限时间算子，仅用于 onDepsChange 的抖动控制（不是通用时间 DSL）。
- 性能形态：必须基于 `dirtyPaths + depsIndex` 增量定位受影响 sources，禁止每次提交扫描全部 source entries。
- tick 对齐：
  - 自动触发必须在 tick 证据链内可解释（至少能关联到 `tickSeq` 与触发原因）；
  - 禁止在 feature 包里通过黑盒 `setTimeout/Promise` 链实现 debounce（影子时间线）。
- 诊断与可解释性：
  - diagnostics=off 近零成本；
  - diagnostics=light/full 允许输出 Slim 事件：触发原因、受影响 source 数、debounce 合并统计等。
- 迁移目标：
  - `@logixjs/query` 不再需要 `auto-trigger` 逻辑；
  - `TraitLifecycle.makeSourceWiring` 从“公共依赖点”退回为内部实现或被替换（避免下游反射 traits）。

### Out of Scope

- 通用的 Action→Action 多步协议/分支/补偿/重试/超时：由 `075-logix-flow-program-ir` 提供（Π 的通用形态）。
- “onMount delay 3s 再 refresh”这类自由时序：应通过 FlowProgram 表达（或在本特性完成后作为独立扩展节点进入 075）。
- ExternalStore / TickScheduler / React 无 tearing（观测参考系的建立与切换）：由 073 负责。

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Query：params/ui 变化自动刷新（Priority: P1）

作为业务开发者，我希望 Query 模块只声明 sources（resource + deps + key），当 `params/ui` 改变时自动触发 refresh，而无需监听 `setParams/setUi` Action 写 watcher。

**Independent Test**（建议落在 `packages/logix-query/test/*` + `packages/logix-core/test/*` 组合）：

- dispatch 触发 state 变化后，内核能用 depsIndex 定位受影响 source 并触发 refresh；
- 配置 debounce 后，同一 tick/短窗口内多次 deps 变化只触发一次 refresh；
- diagnostics=light 下可解释：`trace:source.auto`（或等价 EffectOp meta）带 `tickSeq` 与 `reason=depsChange`。

### User Story 2 - 只保留“受限自由度”，复杂工作流升级到 FlowProgram（Priority: P1）

作为业务开发者，我希望当 refresh 策略超出 “onMount/onDepsChange + debounce” 能力时，有明确的升级路径：

- 关闭 source auto-trigger；
- 用 FlowProgram 表达更复杂的时序（delay/retry/timeout/分支），同时保持 tick 参考系与可解释链路不破。

**Independent Test**：关闭 auto-trigger 后，source 不会被自动刷新；通过 FlowProgram 显式触发 refresh 能正常工作且可关联 tickSeq。

### User Story 3 - 性能：大量 source + 高频输入下不退化（Priority: P2）

作为 runtime 维护者，我希望在 “1000+ sources、输入每秒几十次”的场景下：

- 每次提交的 auto-trigger 计算为 `O(|dirtyPaths| + |affectedSources|)`；
- 不引入无界 fiber 洪峰（debounce 必须合并/可取消，且有诊断计数）。

## Acceptance Criteria

- Feature 包不再需要在 Logic 层“监听 action → 反查 trait → 决定 refresh”（该行为被内核化且可解释）。
- auto-trigger 的触发原因与结果可被诊断系统解释（最小证据链：reason + tickSeq + sourceCount）。
- 事务窗口禁 IO 不被破坏：auto-trigger 只能 enqueue/dispatch，IO 在窗口外由既有 source refresh 运行时执行。
- 存在明确升级路径：受限策略在本特性内核化；自由工作流由 075 提供。

## Dependencies

- 强依赖 073 的 tick 参考系（tickSeq/trace:tick/RuntimeStore）完成后才能对齐“同时性/可回放”的裁决口径。
- 与 075 是互补关系：076 负责 `Π_source`（受限控制律），075 负责 `Π_general`（通用控制律）。
