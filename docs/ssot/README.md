---
title: SSoT Root（平台 + 运行时）
status: living
---

# SSoT Root（平台 + 运行时）

本目录是本仓 **单一事实源（SSoT）** 的聚合根，分为三层：

1. `platform/`：平台概念/模型/契约（原 `docs/ssot/platform`）。
2. `runtime/`：Logix 运行时规范与 API/契约索引（原 `docs/ssot/runtime`）。
3. `handbook/`：工程手册与导航索引（非裁决来源，原 `docs/ssot/handbook/*.md`）。

## 双 SSoT：Authoring SSoT / Platform SSoT（本仓统一字面标题）

为避免“同一概念两套权威口径”，本仓将 SSoT 进一步划分为两大阵营（跨 `platform/` 与 `runtime/` 复用同一术语）：

- **Authoring SSoT（可编辑）**：面向人/LLM/Studio 的“权威输入工件”（可落盘、可生成、可 Schema 校验、版本化；必须纯 JSON）。例如：`WorkflowDef`。
- **Platform SSoT（只读消费）**：面向平台/Devtools/CI gate/diff 的“只读消费工件”（Root Static IR + slices/index 的组合；必须从 Authoring SSoT **确定性编译**得到；禁止手改、禁止成为第二语义源）。例如：`ControlSurfaceManifest` + `workflowSurface`。

原则：

- Authoring SSoT 可以有语法糖/压缩输入（TS DSL / Recipe / Studio），但语义必须 100% materialize 到 Authoring SSoT（禁止“隐式降级为黑盒/opaque”）。
- Platform SSoT 只负责“可判定/可对比/可解释/可回放锚点化”，执行性能来自 runtime 的 internal 计划（例如 `RuntimePlan`），禁止把热路径成本转嫁到 Platform SSoT。

## 裁决优先级（冲突时）

1. `docs/ssot/platform/**`
2. `docs/ssot/runtime/**` + `packages/logix-*` 的真实类型/实现
3. `docs/specs/sdd-platform/workbench/**`（平台 UX/闭环草案）
4. `docs/specs/sdd-platform/impl/**` / `docs/specs/sdd-platform/agents/**`（实现备忘）
5. `examples/**`

## 其它入口（非裁决来源）

以下目录均为非裁决来源；如与 SSoT 冲突，以 SSoT 为准并回写。

- 未定稿探索：`docs/specs/drafts/**`
- 单特性交付：`specs/<id>/**`
- 对外用户文档：`apps/docs/content/docs/**`
- 实现视角导航：`docs/ssot/handbook/reading-room/impl-notes/**`
- 设计哲学与原则叙事：`docs/ssot/handbook/reading-room/philosophy/**`
- 评审与证据/差距复盘：`docs/ssot/handbook/reading-room/reviews/**`
