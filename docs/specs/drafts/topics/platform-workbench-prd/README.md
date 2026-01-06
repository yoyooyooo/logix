---
title: Platform Workbench PRD · Topic Overview
status: draft
version: 2025-12-19
value: core
priority: now
related:
  - ../sdd-platform/00-overview.md
  - ../../../sdd-platform/workbench/20-intent-rule-and-ux-planning.md
  - ../../../sdd-platform/workbench/ui-ux/00-platform-ui-and-interactions.md
  - ../../../sdd-platform/ssot/assets/00-assets-and-schemas.md
  - ../sandbox-runtime/35-playground-product-view.md
  - ../devtools-and-studio/README.md
---

# Platform Workbench PRD · Topic Overview

> 主题定位：把“平台侧规划”下沉为 **可交付的产品级规划**（需求原型、交互设计、系统设计），并显式对齐本仓既有的 SSoT（v3 specs）与平台主线（`docs/specs/sdd-platform/workbench`）。

## 约束（继承上游裁决）

- 平台的统一 IR：`IntentRule`（R-S-T + `source/pipeline/sink`），详见：`../../../sdd-platform/workbench/20-intent-rule-and-ux-planning.md` 与 `.codex/skills/project-guide/references/runtime-logix/logix-core/platform/06-platform-integration.md`。
- Playground/Alignment Lab 是“Executable Spec Lab”，不是纯 Code Runner（参考：`../sandbox-runtime/65-playground-as-executable-spec.md`）。
- Full‑Duplex（Intent ↔ Code）优先走“可解析子集 + 明确降级（Gray/Black Box）”，避免半懂半不懂（参考：`../../../sdd-platform/impl/README.md`）。

## 文档

- `00-overview.md`：现有规划盘点、缺口与本 Topic 的产出边界
- `10-requirements-and-mvp.md`：用户角色、端到端旅程、MVP 分期与验收指标
- `20-information-architecture.md`：Workbench 信息架构、导航与页面职责
- `21-interaction-prototypes.md`：关键流程的线框原型 + 交互细节（偏“怎么用”）
- `22-rule-grid-and-validation.md`：规则网格/决策表的行模型、IntentRule 映射与校验引擎（MVP‑2 核心）
- `23-live-spec-and-scenario-editor.md`：Live Spec（富文本 + Intent Blocks）与 Steps‑First Scenario 编辑器（MVP‑1 核心）
- `30-system-architecture.md`：系统总体架构、关键数据流、组件边界（偏“怎么做”）
- `31-data-model-and-contracts.md`：核心数据模型、版本化、审计与稳定标识策略
- `32-collaboration-and-permissions.md`：协作、权限、审计与 Sign‑off 策略（产品可交付底座）
- `33-alignment-and-diagnostics.md`：对齐报告（AlignmentReport）与 Diagnostics（可解释闭环核心）
- `40-protocols-and-apis.md`：平台/Dev Server/Sandbox/Agent 的协议与 API 草案
- `50-roadmap-open-questions.md`：路线图、依赖与待决问题清单
