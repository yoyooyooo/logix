# Implementation Plan: Logix Control Laws v1（Group Spec）

**Branch**: `077-logix-control-laws-v1` | **Date**: 2026-01-05 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature group description from `specs/077-logix-control-laws-v1/spec.md`

## Summary

本 spec 是 **总控（Spec Group）**：它不直接交付 runtime 代码，而是把 073/075/076 绑成一个“可交付的系统升级”，并用统一的系统方程约束它们的接口、证据链与演进方向。

核心目标：

- UI 完全交给 React（只做 `Ω_F`）
- 逻辑完全交给 Logix（`Π + Δ + Close_{C_T}`）
- 编排从 watcher 胶水升级为声明式 Program（可编译/可导出 IR）

## Technical Context

**Language/Version**: TypeScript 5.9.x（ESM；以仓库 `package.json` 为准）  
**Primary Dependencies**: pnpm workspace、`effect` v3、`@logixjs/core`、`@logixjs/react`、（迁移包）`@logixjs/query`/`@logixjs/form`  
**Testing**: Vitest（Effect-heavy 优先 `@effect/vitest`；React 集成按需要走 browser）  
**Target Platform**: Node.js 20+ + modern browsers  
**Constraints**: 统一最小 IR（Static IR + Dynamic Trace）；稳定标识（tickSeq/instanceId/txnSeq/opSeq）；事务窗口禁 IO；禁止影子时间线与双真相源  

## Constitution Check（总控口径）

- 本 group 的 SSoT：`docs/ssot/platform/foundation/01-the-one.md`
- 参考系（Einstein）：先完成 073 M1（`RuntimeStore + tickSeq` 单一订阅点，no-tearing）再谈更高层 Π。
- 控制律（Newton+）：任何自由编排必须进入 `Π`（FlowProgram），不得回退到 trait meta + 反射式解释。
- 受限控制律：source 的默认自动触发属于 `Π_source`，必须内核化并可解释；复杂时序升级到 075。
- 证据链：IR/Trace Slim、可序列化、稳定锚点；diagnostics=off 近零成本。

## Milestones（只定义“顺序与门槛”，不复制任务）

- **M0（SSoT 固化）**：公式与分层裁决在 SSoT 显眼处可查（已落：`docs/specs/.../97#1.2`），且 073/075/076 互相引用避免漂移。
- **M1（Reference Frame Cutover）**：073 完成 `RuntimeStore + tickSeq` 的 React 单一订阅点（no-tearing）与 `trace:tick` 证据闭环。
- **M2（Program First）**：075 提供 FlowProgram IR（含时间算子）并与 tickSeq 证据链打通；至少 1 条 submit 工作流可声明式表达。
- **M3（Glue Elimination）**：076 以内核 auto-trigger 取代 Query/Form 的 watcher 胶水与反射式解释入口。
- **M4（Integrated Acceptance）**：用一个端到端场景证明 “React 只渲染 / Logix 只编排”，并能导出 IR/Trace 解释链路。

## Perf Evidence Plan（Delegated）

本 group spec 不直接产出 perf 证据；证据落点以各 member spec 为准：

- 073：tick/notify 基线 + React perf boundary
- 075：Program watcher vs 手写 watcher 的 before/after
- 076：大量 sources + 高频输入下 `O(|dirtyPaths|+|affected|)` 的证据

总控验收只检查：证据存在、可比（同 envId/profile/matrixHash）、并且结论已回写到各自 `plan.md`。

## Project Structure（本 group 的产物）

```text
specs/077-logix-control-laws-v1/
├── spec.md
├── plan.md
├── tasks.md
├── quickstart.md
├── spec-registry.json
├── spec-registry.md
└── checklists/
    └── group.registry.md   # 由 $speckit group 生成（索引式执行清单）
```
