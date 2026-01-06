---
title: SDD Platform · Specs Root
status: living
version: 1
---

# SDD Platform（Specs Root）

> 本目录是本仓库“平台侧（SDD Workbench）+ 运行时口径（可回放/可对齐）”的单一事实源集合。
>
> 目标：让 **需求录入者（PM/架构师）→ 架构裁决 → 开发实施 → 运行证据回流** 在同一条链路上闭环，且口径可验证、可迁移、可持续演进。

## 目录职责（面向未来的分区）

- `ssot/`：**概念/模型/契约（最高优先级）**  
  - 三位一体（UI/Logic/Module）、资产与 Schema、最小系统方程（`C_T/Π/Δ⊕/tickSeq`）、RunResult/Trace/Tape/锚点等。
  - 入口：`docs/specs/sdd-platform/ssot/foundation/01-the-one.md`（符号表）与 `docs/specs/sdd-platform/ssot/contracts/00-execution-model.md`（执行模型）。
- `workbench/`：**工作台规格（平台闭环与交互骨架）**  
  - 角色/视图/交接物、Pipeline、Alignment、Spec Studio/语义 UI 等。
- `impl/`：**平台实现备忘（非 SSoT，但作为落地导航）**  
  - Parser/Codegen/可解析子集、Code Runner/Sandbox 取舍、Dev Server/协议面等。
- `agents/`：**Agent 编排协议（平台自动化视角）**  
  - 角色目标、上下文注入、可解析子集约束、Eject/降级策略等。

## 最短阅读路径（按角色）

- 需求录入者（PM/架构师）：`workbench/00-overview.md` → `workbench/ui-ux/03-spec-studio.md` → `workbench/ui-ux/05-multi-view-principles.md` → `workbench/11-spec-to-code-mvp.md`
- 架构师（裁决者）：在上面基础上补 `ssot/contracts/00-execution-model.md` → `ssot/contracts/01-runresult-trace-tape.md` → `workbench/05-intent-pipeline.md`
- 开发（实施者）：`workbench/11-spec-to-code-mvp.md` → `workbench/01-module-traits-integration.md` → `.codex/skills/project-guide/references/runtime-logix/**`

## 冲突裁决（优先级）

1. `docs/specs/sdd-platform/ssot/*`
2. `.codex/skills/project-guide/references/runtime-logix/**` 与 `packages/logix-*` 的真实类型/实现
3. `docs/specs/sdd-platform/workbench/*`
4. `docs/specs/sdd-platform/impl/*`、`docs/specs/sdd-platform/agents/*`（实现备忘/协议草图）
