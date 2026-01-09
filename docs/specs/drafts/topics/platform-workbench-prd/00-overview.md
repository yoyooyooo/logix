---
title: 00 · 总览与缺口盘点（Platform Workbench PRD）
status: draft
version: 2025-12-19
value: core
priority: now
related:
  - ../../../sdd-platform/workbench/00-overview.md
  - ../../../sdd-platform/workbench/05-intent-pipeline.md
  - ../../../sdd-platform/workbench/08-alignment-lab-and-sandbox.md
  - ../../../sdd-platform/workbench/20-intent-rule-and-ux-planning.md
  - ../../../sdd-platform/workbench/ui-ux/00-platform-ui-and-interactions.md
  - ../../../docs/ssot/platform/assets/00-assets-and-schemas.md
  - ../../../docs/ssot/platform/roadmap-logix-platform.md
  - ../../../sdd-platform/impl/README.md
  - ../sandbox-runtime/65-playground-as-executable-spec.md
---

# 00 · 总览与缺口盘点（Platform Workbench PRD）

## 1. 为什么要新开这个 Topic

当前仓库对“平台侧”的规划已经形成两条强主线：

1. `docs/specs/sdd-platform/workbench/*`：以 SDD 生命周期 + 角色/视图 + Context Supply Chain 为中心的“工作台大图”（愿景、架构、链路）。
2. `docs/specs/sdd-platform/workbench/20-intent-rule-and-ux-planning.md` + `docs/specs/sdd-platform/workbench/ui-ux/00-platform-ui-and-interactions.md`：以 `IntentRule` / Universe-Galaxy-Planet 为核心的“平台交互骨架 + 协议约束”。

但当我们准备把平台从“概念正确”推进到“产品可交付”时，会遇到一个缺口：

- 上述文档更多回答“是什么/为什么/边界在哪里”，而 **PRD 级别的可执行细化**（需求原型、交互细则、系统设计拆分）仍缺统一落点；
- 相关内容散落在 `sdd-platform/ui-ux/*`、`sandbox-runtime/*`、`platform/impl/*`、`intent-studio-ux/*` 等主题里，容易重复发散。

因此，本 Topic 的目标是：

- 在不重写上游 SSoT 的前提下，把“平台侧规划”补齐到 **可推进实现的粒度**；
- 明确哪些内容应当最终沉淀回 `docs/ssot/platform`，哪些长期留在 drafts。

## 2. 范围与不做的事

### 2.1 本 Topic 覆盖

- **产品规划**：谁在用、解决什么、MVP 怎么分期、验收指标是什么。
- **交互设计**：Workbench 的信息架构、关键页面原型、关键交互细节（“怎么用”）。
- **系统设计**：平台/Dev Server/Sandbox/Agent 的边界与数据流（“怎么做”），包含数据模型与协议草案。

### 2.2 本 Topic 不覆盖（保持上游裁决）

- 不重新定义 Intent 模型与术语（以 `../../../docs/ssot/platform/foundation/02-glossary.md` 为准）。
- 不重新发明第二套 IR；统一以 `IntentRule`（R-S-T + `source/pipeline/sink`）作为平台侧规则 IR。
- 不把 Sandbox/Playground 简化为“在线跑代码”；它必须服务“Executable Spec Lab”闭环。

## 3. 现有规划盘点（证据清单）

### 3.1 平台大图（Drafts / Topic：sdd-platform）

目录：`../../../sdd-platform/workbench/`

- `00-overview.md`：SDD 平台愿景 + 四阶段（Specify/Plan/Tasks/Implement）+ Context Supply Chain 骨架
- `05-intent-pipeline.md`：Spec → Intent → Blueprint/IR 的管线视角
- `07-intent-compiler-and-json-definition.md`：Definition/Compiler 的方向与边界
- `08-alignment-lab-and-sandbox.md`：Alignment Lab / Sandbox 的位置与责任
- `ui-ux/*`：偏某些工作台/表格形态的 UX 草案素材
- `99-platform-shapes-and-interactions.backlog.md`：全量发散素材库（避免反复重写）

### 3.2 平台 SSoT（v3 specs）

目录：`../../../docs/ssot/platform/`

- `docs/specs/sdd-platform/workbench/20-intent-rule-and-ux-planning.md`：平台顶层模块拆分 + `IntentRule`（R-S-T）的统一模型（平台交互骨架索引）
- `docs/specs/sdd-platform/workbench/ui-ux/00-platform-ui-and-interactions.md`：Universe/Galaxy/Planet 的视角与交互原则（“配置优于连线，代码优于图形”）
- `docs/ssot/platform/assets/00-assets-and-schemas.md`：资产分层（Level0-3）与 Schema/Graph 的“平台语义”落点
- `roadmap-logix-platform.md`：平台→出码、可解析子集、解析器/生成器的阶段性节奏

### 3.3 平台实现备忘（sdd-platform/impl）

目录：`../../../sdd-platform/impl/`

- `README.md`：Full‑Duplex 的硬约束（Fluent 白盒子集、`$.use` 符号表、Eject/Raw 降级策略）
- `code-runner-and-sandbox.md`：Browser/Worker 优先的 Code Runner 决策与边界
- `intent-rule-and-codegen.md`：IntentRule ↔ TS 的解析/出码草图（可解析子集）

### 3.4 Playground/Alignment（Drafts / Topic：sandbox-runtime）

目录：`../sandbox-runtime/`

- `35-playground-product-view.md`：Playground 页的产品视角（页面结构/用户流程/MVP）
- `65-playground-as-executable-spec.md`：把 Playground 定义为 Executable Spec Lab 的方法论与数据模型占位

### 3.5 其它强相关 Topics（避免重复建设）

- `../devtools-and-studio/*`：CLI/Dev Server/Studio 的全双工集成主题
- `../intent-studio-ux/*`：Excel‑killer / 决策表/网格化输入的 UX 收敛主题（PM 视角）
- `../platform-vision/*`：更远期的平台终局推演（避免把 long‑term 内容塞进 MVP）

## 4. 缺口（本 Topic 要补齐的内容）

把“概念正确”推进为“产品可交付”时，目前的缺口主要在：

1. **端到端用户旅程的落地形态**：不同角色如何在同一 Workbench 上协作、在哪一步做 Sign‑off、如何回放与审计。
2. **需求原型/页面原型的体系化**：已有很多碎片原型，但缺少“统一 IA + 原型集 + 可追踪的交互规范”。
3. **系统设计拆分**：平台 backend、Dev Server、Sandbox、Agent 之间的边界、数据流、失败恢复策略需要一份“能实施”的拆分说明。
4. **核心数据模型**：Feature/Scenario/Blueprint/IntentRule/RunResult/AlignmentReport 的版本化、引用关系、稳定标识（去随机化）需要统一。
5. **协议与 API 草案**：Full‑Duplex 的 API（尤其 Dev Server/Studio 的通道与消息）需要以“契约”落下来，避免实现各写各的。

## 5. 本 Topic 的产出与回写策略

- 本 Topic 先以“可实施的 PRD + 系统设计草案”为目标产出；
- 当其中某部分结论稳定后，应回写到：
  - `../../../sdd-platform/workbench/*`（工作台规格，偏交互与链路）
  - `../../../sdd-platform/impl/*`（实现备忘，偏解析/出码/双向同步细节）
  - 或者按需分流到 `../sandbox-runtime/*` / `../devtools-and-studio/*` 等已有主题

下一步：在 `10/20/21/22/23/30/31/32/33/40/50` 中把缺口逐项补齐，并给出可执行的 MVP 分期。
