# Implementation Plan: 054 core-ng Wasm Planner（可选极致路线）

**Branch**: `054-core-ng-wasm-planner` | **Date**: 2025-12-31 | **Spec**: `specs/054-core-ng-wasm-planner/spec.md`  
**Input**: Feature specification from `specs/054-core-ng-wasm-planner/spec.md`

## Summary

目标：在 JS TypedArray reachability（059）仍不足、且证据显示 GC/Map/Set 主导时，把 Planner/Reachability 的关键算法迁移到 Wasm（或 Wasm-like）以进一步压低成本；以 **resident data + integer bridge + buffer reuse** 为不变量，保证 bridge tax 可控且可证据化。

本 spec 只允许做“可选极致路线”：默认仍是 JS（059），Wasm 只是当证据明确要求时的下一梯子。

Update: Trigger Check（Phase 2）已核对，当前未触发（保持 `frozen`，默认仍以 059 JS baseline 为准）。

## Deepening Notes

- Decision: **证据驱动再启动**：必须先完成 059 的 JS baseline，并证明仍无法达标（或收益不足）。
- Decision: **禁止字符串跨边界**：跨边界只允许整型句柄与 TypedArray/ArrayBuffer 视图。
- Decision: **buffer 复用**：Wasm 侧与 JS 侧都必须显式池化/复用，禁止热路径频繁分配/拷贝。
- Decision: **事务窗口禁 IO**：Wasm 加载/初始化在装配期完成；txn window 只做纯计算。
- Decision: **回退必须可解释**：Wasm 不可用/初始化失败/bridge 超预算 → 退回 JS（059）并输出稳定 `reasonCode`。

## Technical Context

- JS baseline（必须先达标或明确不足）：`specs/059-core-ng-planner-typed-reachability/`
- reachability 当前落点（JS）：`packages/logix-core/src/internal/state-trait/converge.ts`（plan compute / reachability 判定）
- Exec IR tables（TypedArray）：`packages/logix-core/src/internal/state-trait/converge-exec-ir.ts`
- Wasm 分发（Browser/Sandbox）：需要对齐 Vite/Sandbox host 的资源加载与缓存策略（但不得 txn 内 IO）

## Constitution Check

- **统一最小 IR**：Wasm 只是执行载体，不得引入第二套 IR；所有可解释字段仍以统一 IR/Trace 表达。
- **Deterministic identity**：跨边界的 id/handle 必须稳定可对比；禁止随机化。
- **Transaction boundary**：txn 内纯同步；禁止 IO/await；bridge tax 需要预算与可解释降级。
- **Dual kernels**：
  - core=`not-yet`（不做）
  - core-ng=`trial-only → supported`（以证据达标裁决；默认仍走 JS baseline）
- **Performance & diagnosability**：必须 Browser 证据门禁；且必须把 bridge tax 显式纳入指标与解释字段。

## Perf Evidence Plan（MUST）

> 只有在“触发条件满足”后才执行本节；否则仅作为预案保留。

- Matrix SSoT：`.codex/skills/logix-perf-evidence/assets/matrix.json`
- Browser 必须覆盖（至少 `priority=P1`）并输出 bridge tax 指标（例如：`bridgeCopyBytes`/`bridgeDurationMs` 的采样摘要）
- Node 可选但推荐：用于确认“Wasm 形态在非浏览器宿主”不引入回归
- PASS 判据：Browser diff 必须 `comparable=true && regressions==0`；bridge tax 不得成为新主导瓶颈

## Project Structure

### Documentation (this feature)

```text
specs/054-core-ng-wasm-planner/
├── spec.md
├── plan.md
├── quickstart.md
└── tasks.md
```

### Source Code (implementation targets)

```text
packages/logix-core/src/internal/state-trait/*        # JS baseline reachability（对照）
packages/logix-core-ng/src/*                          # core-ng 注入 Wasm planner（trial-only）
packages/logix-react/test/browser/*                   # browser perf suites（P1）
```

## Deliverables by Phase

- **Phase 0（research）**：用 059 的证据确认触发条件；明确 Wasm 边界（只做 reachability 还是扩到 plan 编译）与 bridge tax 预算/指标。
- **Phase 1（design）**：固化跨边界数据结构（handles + buffers）与 fallback reasonCode；明确 Browser/Sandbox 分发策略（装配期加载）。
- **Phase 2（tasks）**：见 `specs/054-core-ng-wasm-planner/tasks.md`。

### Gate Result (Post-Design)

- FROZEN（保留为可选极致路线预案；仅在触发条件满足时解冻启动；默认仍以 059 的 JS baseline 为准）
