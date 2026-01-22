---
title: Workflow 命名收敛教程 · 分层边界与 forward-only 改名路线（从 0 到 1）
status: draft
version: 1
---

# Workflow 命名收敛教程 · 分层边界与 forward-only 改名路线（从 0 到 1）

> **定位**：本文回答三个常见困惑：  
> 1) 为什么仓库里偶尔还能看到历史命名残留？它是残留名还是分层设计？  
> 2) 为什么对外 API 看起来几乎没变，却引入了 workflow/IR 链路？  
> 3) 如果要把“内外一致都叫 `Workflow`”做彻底（包括锚点字段），会牵动哪些需要裁决点？  
> **裁决来源**：关于 Π/Workflow/Canonical AST 的命名与边界，最终以 `docs/ssot/platform/**` 与 `specs/075-workflow-codegen-ir/**` 为准；本文负责把“命名与分层”讲成可执行的迁移/对齐剧本。

## 0. 最短阅读路径（10 分钟上手）

1. 读术语裁决：`docs/ssot/platform/foundation/glossary/04-platform-terms.md`（Canonical AST / WorkflowDef / Workflow Static IR / workflowSurface）。  
2. 读 075 的定位：`specs/075-workflow-codegen-ir/spec.md`（Workflow=平台/AI 出码入口）。  
3. 读 Root IR 对齐：`docs/ssot/platform/contracts/03-control-surface-manifest.md`（workflowSurface/stepKey）。  
4. 如果你关心“改名会引出哪些需要裁决点”：看 `specs/073-logix-external-store-tick/pr.md`（改名提案）。

## 1. 心智模型（为什么“命名收敛”不等于机械替换字符串）

### 1.1 目前的分层意图：authoring（值对象） vs canonical（规范形） vs runtime（执行计划）

在 075 的设计里，多层对象有明确分工：

- **authoring 入口（对外 DX）**：`Workflow` 值对象  
  - 目标：提供 `validate/exportStaticIr/install` 等冷路径能力，作为平台/AI 的出码入口；  
  - 不追求“人类日常手写爽”，而是追求可 IR 化/可门禁/可回写。

- **规范形（语义唯一）**：`Canonical AST`  
  - 目标：去语法糖/默认值落地/分支显式/`stepKey` 完整；  
  - 同一语义只有一种表示，便于 digest/diff 与稳定锚点。

- **可导出 IR（Π slice）**：`Workflow Static IR`（`WorkflowStaticIr`）  
  - 目标：可 diff/可审阅/可视化的结构化 IR；  
  - Root IR（ControlSurfaceManifest）只引用其 digest 与 slices/index，不把整图塞进事件流。

> 结论：这里的“分层”不是“旧名 vs Workflow”，而是 `Workflow（值对象）` / `WorkflowDef（纯 JSON SSoT）` / `Canonical AST（规范形）` / `WorkflowStaticIr（Π slice）` / `RuntimePlan（internal 热路径）` 的分工。

### 1.2 为什么做完一系列需求后“内部更复杂了”，但对外 API 变化不大

这是典型的“外观不变、内核升级”：

- 对业务作者：依然是 Module/Logic/Flow + Service Tag 的写法（面向 What）。  
- 对平台/Devtools：必须补齐“可对比、可解释、可回放”的工件链路（面向 How），因此内部会引入：
  - digest/diff/anchors
  - Manifest/StaticIR/TrialRunReport
  - workflowSurface（Π slice）与 stepKey 协议

外部 API 不大改，是为了让业务仍在熟悉的抽象上开发；内部复杂，是为了让平台/CI/Devtools 有单一真相源（IR）。

### 1.3 “workflow 未来主要用于承载平台出码，而不是直接给用户使用”是否成立

从 075 的定位看，这个判断基本成立：

- workflow/Π 是平台侧出码与对齐的核心（结构化、可门禁、可回写）。  
- 人类手写可以存在，但必须显式登记为 governed 或 opaque（不能静默黑盒）。  
- 对业务作者而言，最常用的仍是 Flow/Logic 的 watcher/Task 编排；workflow 作为“升级路线”（复杂时序/对齐需求）存在。

## 2. 我还看到历史命名：残留还是设计？

按当前 specs 的口径，它更接近“历史名残留”，不是现行分层名：

- 现行 075 已统一对外口径为 `Workflow`（public API/合同/数据模型均已收敛）。  
- 如果你在仓库里仍看到历史词，通常来自：旧教程/旧 PRD/迁移说明中的历史措辞（应逐步消除，避免文档漂移）。

换句话说：**现行对外与对内统一用 Workflow。**

## 3. 如果要把“内外一致都叫 Workflow”做彻底，会引出哪些需要裁决的点

下面是实践中最容易被低估的牵引点（改名不是机械替换字符串）。

### 3.1 Public Submodule 与 import 形态（契约级）

如果历史名曾作为公共子模块暴露，改名就属于契约变更，必须同步：

- `specs/030-packages-public-submodules/contracts/public-submodules.md`（概念地图/exports 裁决）  
- 文档与示例的 import 形态  
- 迁移说明（forward-only，无兼容层）

### 3.2 锚点命名：programId/nodeId/stepKey 是否也要一起改

命名一致性往往会牵动锚点协议：

- 如果外部叫 Workflow，内部还叫 program/node，读者会把它当成两套东西；  
- 但如果强行全改，也会牵动：
  - Root IR（ControlSurfaceManifest）的字段命名  
  - diagnostics/pointer 的稳定性（迁移与 diff 的定位口径）  

这类决策需要明确裁决，而不是在实现里边改边碰运气。

### 3.3 与历史概念冲突：Program / Process / Flow 的既有语义

仓库里已经有 `Process`（长期进程）、`Flow`（watcher 编排）等概念：

- 如果把历史名收敛为 `Workflow`，是否会与“流程/流程图”的既有语义混淆？  
- 是否需要同时在 glossary 里给出“Workflow（Π）≠ Flow（runtime 编排）≠ Process（长期进程）”的对照表？

### 3.4 迁移策略：forward-only（无兼容层）意味着什么

按仓库策略（forward-only evolution）：

- 改名不引入兼容层、不留弃用期；  
- 必须提供迁移说明与可定位 diff（pointer/anchors）；  
- 文档与 SSoT 要同步更新，避免并行真相源漂移。

## 4. forward-only 改名路线（建议的最小闭环）

> 这是“教程视角的建议路线”，不是最终裁决；是否执行以对应 spec/SSoT 的裁决为准。

1. **先在 SSoT/术语层拍板**：更新 `docs/ssot/platform/foundation/glossary/04-platform-terms.md` 的命名裁决（Workflow/WorkflowDef/WorkflowStaticIr/RuntimePlan）。  
2. **更新 public-submodules 合同**：在 030 的 public-submodules 清单里改概念入口与 exports（避免“实现先跑、合同后补”）。  
3. **同步迁移说明模板**：在相关 specs（例如 075/076）写 `contracts/migration.md`，用 pointer/anchors 指向改名点。  
4. **最后再改实现与示例**（如果/当实现存在）：一次性全量替换，保持 forward-only。

## 5. 代码锚点（Spec / Doc Anchors）

1. `docs/ssot/platform/foundation/glossary/04-platform-terms.md`：Canonical AST / WorkflowDef / Workflow Static IR / workflowSurface 的术语裁决。  
2. `docs/ssot/platform/contracts/03-control-surface-manifest.md`：workflowSurface 与 stepKey/identity 去随机化约束。  
3. `specs/075-workflow-codegen-ir/spec.md`：Workflow 的定位（平台/AI 出码入口）。  
4. `specs/075-workflow-codegen-ir/contracts/ir.md`：Canonical AST → Static IR 的锚点与 digest 口径。  
5. `specs/030-packages-public-submodules/contracts/public-submodules.md`：public submodule/exports 的契约约束。  
6. `specs/073-logix-external-store-tick/pr.md`：改名提案（需要裁决点清单）。  

## 6. 常见坑（Anti-patterns）

- 只改文档不改合同：public submodule/exports 与文档漂移，后续会反复“改回去”。  
- 先做兼容层：与 forward-only 策略冲突，会让内部长期背负双名/双入口税。  
- 锚点与命名一起“顺手改”但不写迁移：会让 diff/诊断 pointer 失效，工具链断链。  
