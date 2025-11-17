# Implementation Plan: 068 Watcher 纯赚性能优化（全量交付，不拆短/中长期）

**Branch**: `068-watcher-pure-wins` | **Date**: 2025-12-31 | **Spec**: `specs/068-watcher-pure-wins/spec.md`  
**Input**: Feature specification from `specs/068-watcher-pure-wins/spec.md`

## Summary

目标：把 watcher 成本从“随总 watcher 数线性放大”收敛到“主要随相关 watcher 放大”，并把所有结论锁死在可回归证据上（执行顺序在 `tasks.md` 中拆分）。

- 交付项（均为 MUST）：watcher 压力回归用例；Action tag 分发的无关触达削减；`$.onState` 的声明依赖→增量通知路径；Primary Reducer 与 watcher 分层；传播 IR 的最小契约与导出口径；闭包分型与降级/门禁口径。

## Deepening Notes（事实与现状）

- Fact: 当前 `$.onAction("tag")` 是在 `actions$` 全量广播流上做 filter（无关 watcher 也会“看一眼”事件）。实现入口：`packages/logix-core/src/internal/runtime/core/BoundApiRuntime.ts`。
- Fact: `actions$` 源头是 `Stream.fromPubSub(actionHub)`；`dispatch` 的 publish 走 lossless/backpressure 通道，并且 publish 发生在事务窗口之外（避免死锁）。实现入口：`packages/logix-core/src/internal/runtime/core/ModuleRuntime.dispatch.ts`、`packages/logix-core/src/internal/runtime/core/ModuleRuntime.ts`。
- Fact: 当前 `$.onState(selector)` 走 `stateRef.changes |> map(selector) |> Stream.changes`，等价于“每次可观察提交每条订阅都要重算 selector + 去重”。实现入口：`packages/logix-core/src/internal/runtime/core/ModuleRuntime.ts`。
- Fact: Runtime 已具备 `ReadQuery.compile`（JIT 推导 reads/selectorId）与 `SelectorGraph`（基于 dirtySet 精准重算/精准通知）的实现，但 `$.onState` 目前没有走这条链路。实现入口：`packages/logix-core/src/internal/runtime/core/ReadQuery.ts`、`packages/logix-core/src/internal/runtime/core/SelectorGraph.ts`。
- Fact: Primary Reducer 的同步主路径在 runtime 里已存在（reducerMap + dispatch 前置应用 + patchPaths 支持），但“最佳实践/门禁/统计”尚未统一为可回归口径。实现入口：`packages/logix-core/src/internal/runtime/core/ModuleRuntime.dispatch.ts`。

## Technical Context

**Language/Version**: TypeScript 5.8.x（ESM；以仓库 `package.json` 为准）  
**Primary Dependencies**: pnpm workspace、`effect` v3、`@logix/core`、（browser evidence）`@logix/react`  
**Storage**: N/A（证据落盘到 `specs/068-watcher-pure-wins/perf/*`）  
**Testing**: Vitest（Effect-heavy 优先 `@effect/vitest`）  
**Target Platform**: Node.js 20+ + modern browsers  
**Project Type**: pnpm workspace（`packages/*` + `examples/*`）  
**Performance Goals**: watcher 压力回归无退化；Action/State 的 fan-out 在对照场景中有可判定改善；编译期优化 on/off 行为一致且可解释回退（见 `spec.md` 的 SC-001~SC-005）。  
**Constraints**: 默认近零诊断税；统一最小 IR + 稳定锚点（instanceId/txnSeq/opSeq）；事务窗口禁 IO；AOT-ready but not AOT-required（无构建期插件也能用，启用编译期优化仅做保守正确的增强）；consumer 不直接依赖 `@logix/core-ng`  
**Scale/Scope**: 聚焦 watcher 分发与订阅传播，不引入“丢弃/重排/合并 Action”的隐式语义

## Kernel support matrix

- `core`: supported（默认档与交付基线）
- `core-ng`: supported（core-ng 作为 Runtime Services overrides 注入时，同样受益；本 spec 不要求 consumer 直接依赖 core-ng）

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### Answers (Pre-Design)

- **Intent → Flow/Logix → Code → Runtime**：本特性属于 Runtime 执行面/订阅传播面的性能治理：不改变业务 Flow 语义，只减少无关触达与无谓重算，并把回归门禁固化。
- **Docs-first & SSoT**：不新增平台术语；与 watcher 性能心智模型相关的契约应同步更新 runtime-logix 的 watcher/Flow 文档，避免事实源漂移。
- **IR & anchors**：不改变统一最小 IR；传播 IR 仅新增最小“可序列化表结构”契约，且必须能降解并与现有 trace 锚点对齐。
- **Deterministic identity**：不引入随机/时间锚点；既有 instanceId/txnSeq/opSeq 语义保持，并用于回归用例与证据锚点。
- **Transaction boundary**：不引入事务窗口 IO/await；任何 publish/背压等待必须保持在事务窗口之外。
- **Internal contracts & trial runs**：若引入 Action topic-index / ReadQuery 路由，需要收敛为内部可替换契约并可测；不得形成 magic fields 或 process-global 单例依赖。
- **Dual kernels (core + core-ng)**：变更落在 `@logix/core`，不要求 consumer 依赖 core-ng；证据以 core 默认档为主，并保持 FullCutoverGate 等装配期门禁不进入热路径。
- **Performance budget**：强制 `$logix-perf-evidence`（Node + Browser 至少各 1 条）作为硬门；必要时补充单测/计数器回归防线以拦截泄漏。
- **Diagnosability & explainability**：默认档近零成本；启用时提供可序列化、可解释的“为何降级/为何回退/为何触达”原因码。
- **Breaking changes**：不引入破坏性语义变更；如需要改变 `$.onState` 的“等价判定”或 Action 分发语义，必须显式 opt-in 并提供迁移说明（forward-only）。
- **Quality gates**：实现阶段至少通过 `pnpm typecheck`、`pnpm lint`、`pnpm test:turbo`，并完成本 spec 的 perf evidence。

### Gate Result (Pre-Design)

- PASS

## Perf Evidence Plan（MUST）

- Baseline 语义：代码前后（before=改动前，after=改动后）
- Matrix SSoT：`.codex/skills/logix-perf-evidence/assets/matrix.json`
- Hard conclusion：交付结论必须 `profile=default`（`quick` 仅线索；需要更稳可用 `soak` 复核）
- PASS 判据：`pnpm perf diff` 输出 `meta.comparability.comparable=true` 且 `summary.regressions==0`

**Collect (Node / watcher fan-out)**：

- 新增 068 Node suite（见本 spec 的 `contracts/perf-evidence-suites.md`），以“高频 Action + 大量 tag watcher + 少量 predicate watcher”的对照为核心。

**Collect (Browser / watcher pressure)**：

- 新增 068 browser perf boundary（同样见 `contracts/perf-evidence-suites.md`），以“React 挂载 module + 大量 onState/onAction watcher”作为对照。

**Collect (Node or Browser / compilation enhancement on/off)**：

- 新增 068 Suite C（见 `contracts/perf-evidence-suites.md`），覆盖“未启用编译期优化 vs 启用编译期优化”的行为一致性、收益子集与回退锚点。

Failure Policy：任一 diff `meta.comparability.comparable=false` 或 `summary.regressions>0` → 不得下硬结论，必须复测并定位（profile 升级或缩小 files 子集）。

## Project Structure

```text
specs/068-watcher-pure-wins/
├── spec.md
├── plan.md
├── checklists/
├── research.md
├── data-model.md
├── contracts/
├── quickstart.md
└── tasks.md
```

## Source Code (implementation targets)

```text
packages/logix-core/
├── src/internal/runtime/core/ModuleRuntime.ts
├── src/internal/runtime/core/ModuleRuntime.dispatch.ts
├── src/internal/runtime/core/BoundApiRuntime.ts
├── src/internal/runtime/core/ReadQuery.ts
├── src/internal/runtime/core/SelectorGraph.ts
└── test/**  # watcher 压力回归与“无关触达”对照

packages/logix-react/
└── test/browser/perf-boundaries/**  # 新增 068 的 browser perf boundary

.codex/skills/logix-perf-evidence/
└── scripts/**  # 新增 068 的 perf suites（node + browser）
```

## Design（关键机制）

### 1) Watcher 压力回归：先把“泄漏/灾难退化”变成可判定信号

- 指标（默认档近零成本）：
  - 活跃 watcher/Fiber 数（近似计数即可，优先用内部计数器/Debug sink）
  - actionHub/topicHub 的订阅规模与背压等待时间分布（对照 publish 等待）
  - onState 触发次数（无关 dirtySet 提交应为 0）
- 判定：
  - N 次高频 dispatch 后指标不再线性增长（上界稳定）
  - 销毁/回收后指标回落且无事件继续流出

### 2) Action topic-index：把 fan-out 从“全量广播”收敛到“相关触达”

- 目标：让 `$.onAction("tag")` 不再订阅全量 `actions$`，而是订阅 `tag` 专属 topic 流；
  - 相关 Action：只触达订阅该 tag 的 watcher
  - 无关 Action：不触达该组 watcher（避免无意义 filter）
- 约束：
  - 不改变业务语义（每条 action 对相关 watcher 仍然“必达/有序”）
  - 背压传播面缩小：慢 watcher 只影响其 topic，不应拖慢其它 tag 的 publish
- 兼容：`$.onAction(predicate)` / Schema 形态仍走全量流（除非未来能静态分析 predicate）

### 3) `$.onState` → `ReadQuery + SelectorGraph`：声明依赖就增量通知

- 目标：在不改变默认等价判定语义的前提下，让 `onState(selector)` 在“提交不相关”时完全不重算、不触发。
- 路由策略：
  - 能编译为静态 lane（拥有 reads/selectorId）的 selector：走 SelectorGraph 的 entry hub（dirtySet 精准挑选）
  - 动态 lane selector：安全回退为逐提交重算（保守正确），并提供 strict gate（warn/error）以避免隐式退化
- 语义约束：
  - 默认等价判定保持“引用相等/结构不保证”，不做隐式 shallow-equals（如要改变必须显式 opt-in）

#### 3.1) 编译期优化（可选增强）与回退语义（宁可放过不可错杀）

- 默认路径（无需任何构建期插件）：依赖 `ReadQuery.compile` 的运行时能力（JIT 推导 reads/selectorId 或进入 dynamic lane），保证可用性与语义一致。
- 可选路径（显式启用编译期优化）：当存在可用的静态化产物时，运行时可以直接采用静态 lane（避免运行时推导/不必要开销）；但必须保守正确：无法证明语义等价则回退到运行时保守路径。
- 回退/降级必须可解释：对 “产物缺失/不匹配/不可分析 selector” 等情况输出稳定原因码，并支持 strict gate（warn/error 或 fail fast）以避免关键模块悄悄退化。

### 4) 传播 IR 与闭包分型（本 spec 只固化契约与证据口径）

- 传播 IR：最小 CSR/SoA 表结构（FieldPathId/StepId/offsets/values）与可序列化导出；默认档不物化 labels。
- 闭包分型：定义 C0/C1/C2 的可判定口径与降级阀门；auto 只对“稳赢子集”启用，且必须可解释。

## Deliverables by Phase

- **Phase 0（research）**：`research.md`（现状/候选方案/取舍与风险；所有不确定点必须闭环）
- **Phase 1（design）**：`data-model.md`、`contracts/*`、`quickstart.md`（指标模型、内部契约、证据跑法）
- **Phase 2（tasks）**：由 `tasks.md` 承载（`$speckit tasks 068` 生成/维护）
