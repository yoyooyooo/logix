# Implementation Plan: 055 core-ng Flat Store PoC（arena/SoA/handle 化）

**Branch**: `055-core-ng-flat-store-poc` | **Date**: 2025-12-31 | **Spec**: `specs/055-core-ng-flat-store-poc/spec.md`  
**Input**: Feature specification from `specs/055-core-ng-flat-store-poc/spec.md`

## Summary

目标：探索把核心状态与热路径数据结构从“对象图”迁移到“flat memory（SoA/arena + integer handles）”，以显著降低 GC 压力与长尾；但必须做到：

- **先 PoC 后扩面**：先选一个明确试点（收益最大且风险可控），证据闭环后再决定是否扩面；
- **integer handles**：跨层传递只允许稳定 handle/id（对齐 050），禁止对象引用作为隐式契约；
- **可解释/可回放**：flat 结构必须能映射回统一最小 IR/Trace（否则就是并行真相源）；
- **可回退**：无法达标必须可回到旧实现（且回退口径可解释）。

## Deepening Notes

- Decision: 本 spec 默认只做 **trial-only PoC**，不得直接改默认路径；任何默认切换都必须另立迁移 spec。
- Decision: 证据门禁：必须 `$logix-perf-evidence`（Node + ≥1 headless browser）before/after/diff，且 `comparable=true && regressions==0`；额外关注 heap/alloc delta 与长尾（p95/p99）。
- Decision: 事务窗口禁 IO；arena/flat store 的分配与快照策略必须可证据化（避免隐式泄漏/抖动）。

## Technical Context

- 稳定 id/handle 基座：`specs/050-core-ng-integer-bridge/`
- txn/patch/dirtyset 零分配 guardrails：`specs/051-core-ng-txn-zero-alloc/`
- converge/txn 热路径（当前对象图 + draft）：`packages/logix-core/src/internal/state-trait/converge.ts`
- dirty-set/事务：`packages/logix-core/src/internal/runtime/core/StateTransaction.ts`

## Constitution Check

- **统一最小 IR**：flat store 必须可降解到统一 IR（Static IR + Dynamic Trace），并保持 stable anchors。
- **Deterministic identity**：handle/id 必须稳定可对比；禁止随机化。
- **Transaction boundary**：txn 内纯同步；不得引入 IO/await；分配/快照策略必须受控且可解释。
- **Dual kernels**：
  - core=`not-yet`（不做）
  - core-ng=`trial-only → supported`（以证据达标裁决；默认路径不受影响）
- **Performance & diagnosability**：Node+Browser 证据门禁；diagnostics=off 近零成本（不引入常驻观测开销）。

## Perf Evidence Plan（MUST）

> 试点已预选（`patch/dirties/dirtyRoots` 数据面）；但在解冻前仍仅作为预案保留。

- Matrix SSoT：`.codex/skills/logix-perf-evidence/assets/matrix.json`（至少覆盖 `priority=P1`）
- Browser 必须覆盖：关注长尾（p95/p99）与 heap/alloc delta
- PASS 判据：Node 与 Browser diff 都必须 `comparable=true && regressions==0`

## Project Structure

### Documentation (this feature)

```text
specs/055-core-ng-flat-store-poc/
├── spec.md
├── plan.md
├── quickstart.md
└── tasks.md
```

### Source Code (implementation targets)

```text
packages/logix-core/src/internal/state-trait/*        # 现有对象图路径（对照）
packages/logix-core-ng/src/*                          # core-ng trial-only 注入 flat store PoC
packages/logix-react/test/browser/*                   # browser perf suites（P1）
```

## Deliverables by Phase

- **Phase 0（research）**：试点已预选：`patch/dirties/dirtyRoots` 数据面（见 `specs/055-core-ng-flat-store-poc/tasks.md` Phase 2），并维持 trial-only + 可回退 + 可解释 + 可证据化 约束。
- **Phase 1（design）**：固化 flat store 数据模型（arena/SoA/handles）与 IR 映射、快照与回退口径（禁止半成品默认化）。
- **Phase 2（tasks）**：见 `specs/055-core-ng-flat-store-poc/tasks.md`。

### Gate Result (Post-Design)

- FROZEN（保留为 trial-only PoC 预案；仅在试点明确且触发条件满足时解冻启动；默认路径不得受影响）
