---
title: Logix NG Architecture (Drafts)
status: draft
layer: Runtime
related:
  - docs/specs/intent-driven-ai-coding/99-glossary-and-ssot.md
  - docs/specs/intent-driven-ai-coding/97-effect-runtime-and-flow-execution.md
  - specs/045-dual-kernel-contract/spec.md
  - specs/046-core-ng-roadmap/spec.md
  - specs/048-core-ng-default-switch-migration/spec.md
  - specs/039-trait-converge-int-exec-evidence/spec.md
  - specs/043-trait-converge-time-slicing/spec.md
  - specs/044-trait-converge-diagnostics-sampling/spec.md
---

# Logix NG Architecture (Drafts)

> **Status**: Exploratory / Vision
> **Context**: High-Performance Runtime Next Generation
> **Scope**: Runtime next-gen 架构探索（非 SSoT）

本目录汇集了关于下一代 Logix 引擎架构的探索性草案，核心目标是**极致性能 (Extreme Performance)** 与 **工业级可预测性 (Predictability)**。

## 定位与对齐

- 本 Topic 只做“方向/约束/候选架构”的探索，不直接定义对外语义，也不作为实现裁决的唯一来源。
- 任何会影响对外 API/语义、诊断协议、证据口径的内容，需要回写到 SSoT（`docs/specs/intent-driven-ai-coding/*` 与 `.codex/skills/project-guide/references/runtime-logix/*`）并以 `specs/<NNN-*>/` 形式交付。
- NG 路线的“可交付事实源/调度入口”以 `specs/046-core-ng-roadmap/` 为准（里程碑、硬门槛、后续 specs 清单、证据门禁）。
- 默认内核的**当前裁决**以 `specs/046-core-ng-roadmap/roadmap.md` 的 `Policy Update / 单内核默认（2025-12-31）` 为准；`specs/048-core-ng-default-switch-migration/` 仅保留为历史迁移 spec（不作为当前默认行为裁决）。

## 硬约束（宪法对齐）

- **统一最小 IR**：所有“OpCode/Bytecode/Plan/Kernel”必须能完全降解到 `Static IR + Dynamic Trace`；Devtools / Sandbox 只认 IR，禁止第二套并行协议。
- **稳定标识**：所有运行时/证据链路统一稳定 `instanceId/txnSeq/opSeq`（以及 pathId/stepId 等）以支持解释、回放与 diff。
- **事务窗口禁 IO**：Transaction 窗口内禁止异步 IO/await/跨线程消息；任何 off-main-thread 方案若改变 0/1 commit 语义必须另立 spec。
- **诊断 Slim 且可序列化**：`diagnostics=off` 需接近零分配；开启诊断时也必须有预算闸门与可解释链路。
- **证据先行**：触及核心路径的优化必须走 `$logix-perf-evidence` 产出可复现的 Node + Browser before/after/diff；严禁“整型链路做到一半又字符串往返”的半成品中间态。

## 045 分支点之后：长期路线（建议）

045 的意义不是“立刻重写内核”，而是把未来的 NG 重写变成**可并行、可验证、可回退**的工程动作（契约 + 证据 + 对照 diff），让你做完 045 之后不会失去方向。

### Track A：把当前内核做到“够硬”（支撑你放心做平台）

- 目标：在不改对外语义的前提下，把最热的收敛/事务链路整型化、零分配化，并把证据门禁固化到 `$logix-perf-evidence`。
- 主要 spec：`specs/039-trait-converge-int-exec-evidence/`
- 退出条件（推荐）：`SC-002/SC-003/SC-005` 达标 + Node+Browser before/after/diff 固化；并且 diagnostics=off 能证明“近零成本”。
- 备注：这条路线本质是在当前内核里验证 NG 的关键原则（消灭字符串往返、TypedArray 复用、Bitset、Accessor 预编译、诊断闸门），属于“纯赚的底盘加固”。

### Track B：并行推进 `core-ng`（不拖慢上层生态）

- 目标：在 `@logix/core` 的 Kernel Contract 下，把 `@logix/core-ng` 作为可注入实现包跑起来，并能用契约验证 harness + 证据对照差异报告拦截风险。
- 主要 spec：`specs/045-dual-kernel-contract/`
- 退出条件（推荐）：`@logix/react`/Devtools/Sandbox 不依赖 core-ng；能在同进程构造 core 与 core-ng 两棵 runtime 做对照；差异可被结构化 diff 定位；默认路径无性能回归证据。
- 备注：早期允许在 `trial-run/test/dev` 按 serviceId 渐进替换，但“宣称可切默认/已切到 core-ng”必须全套切换（无 fallback），由证据判定。

### Track C：明确“会改变语义/口径”的探索（不要混进纯优化链路）

- `specs/043-trait-converge-time-slicing/`：time-slicing/降频/跨帧收敛（显式 opt-in，改变外部语义边界）。
- `specs/044-trait-converge-diagnostics-sampling/`：采样诊断（引入新的观测口径，必须与 off/light/full 关系清晰）。

> 建议顺序：先把 Track A + Track B 的“地基”打稳（证据 + 契约 + 热路径纯赚优化），再用 Track C 做显式 opt-in 的语义探索，避免把“纯优化”与“语义改变”绑死。

## Roadmap

| ID     | Title                                                            | Keywords                                     | Status |
| :----- | :--------------------------------------------------------------- | :------------------------------------------- | :----- |
| **00** | [Vision: Database Internals](./00-vision.md)                     | `Flat Memory`, `Linear Stream`, `Zero-GC`    | Vision |
| **01** | [Compiler-Driven Runtime (AOT)](./01-compiler-driven-runtime.md) | `Vite Plugin`, `Static Analysis`, `Inlining` | Idea   |
| **02** | [Wasm Planner Exploration](./02-wasm-planner.md)                 | `Wasm`, `Static IR Kernel`, `SIMD`           | L1 (Exploration) |

## 与当前内核增量的关系（落地锚点）

- `specs/039-trait-converge-int-exec-evidence/`：以“整型执行链路 + 证据达标”为锚点验证 NG 的核心原则（消灭字符串 split/往返、TypedArray 复用、诊断零分配闸门等）。
- `specs/043-trait-converge-time-slicing/`：显式 opt-in 的 time-slicing（改变外部语义），不应混入 039 的“纯优化不改语义”边界。
- `specs/044-trait-converge-diagnostics-sampling/`：诊断采样/新口径（改变观测语义），独立成 spec 以避免污染 039 的证据与解释链路。

## Related Topics

- [`platform-vision/json-runtime-separation.md`](../platform-vision/json-runtime-separation.md)：关于 Intent Compiler 与平台侧“注水”机制的讨论。
- [`ai-native-ui/30-compilation-toolchain.md`](../ai-native-ui/30-compilation-toolchain.md)：关于 AI Slot 代码生成与通用编译工具链。
- [`logix-wasm-endgame/README.md`](../logix-wasm-endgame/README.md)：以“一次 txn 一次调用 + 线性内存”为硬约束，倒推 WASM 终点需要的 IR/编译/执行形态。
