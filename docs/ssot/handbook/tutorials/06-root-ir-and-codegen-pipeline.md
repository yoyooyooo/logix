---
title: 平台 Root IR 与出码流水线 教程 · 剧本集（从 0 到 1）
status: draft
version: 1
---

# 平台 Root IR 与出码流水线 教程 · 剧本集（从 0 到 1）

> **定位**：本文是 `docs/ssot/handbook/` 的“维护者教程/剧本集”（how-to），用于新成员上手、老成员回味，并把平台/工具链/运行时的“同一套 IR 语言”讲清楚。  
> **重要**：本文不是裁决来源；凡涉及 MUST/协议/边界的最终口径以 SSoT 为准（`docs/ssot/platform/**` 与 `docs/ssot/runtime/**`）。

## 0. 最短阅读路径（10–20 分钟先建立正确心智）

如果你只想快速搞清楚“为什么要多一条 IR 链路、每一段到底干嘛”，推荐按这个顺序：

1. 术语与分层（先把名字对齐）：`docs/ssot/platform/foundation/glossary/04-platform-terms.md`（4.6/4.7）
2. Root IR 合同（平台只认什么工件）：`docs/ssot/platform/contracts/03-control-surface-manifest.md`
3. 075 的分层与数据模型（Canonical AST/Static IR 的硬裁决）：`specs/075-flow-program-codegen-ir/spec.md` + `specs/075-flow-program-codegen-ir/data-model.md`
4. digest/diff/anchors 的“为什么”（cache key / 回链 / 门禁）：`docs/ssot/handbook/tutorials/01-digest-diff-anchors.md`
5. RunResult/Trace/Tape 的 grounding（静态 digest 如何进入运行结果）：`docs/ssot/platform/contracts/01-runresult-trace-tape.md`

## 1. 先回答你最关心的三个问题（把“复杂度焦虑”放回正确位置）

### 1.1 做完 073/075/079/081/082 这一系列后，内部是不是更复杂了？

是的——**但这种“复杂”来自把隐式黑盒显式化**，而不是凭空引入新花样。

更准确地说：以前系统里已经存在“很多层次的事实源”（手写 watcher、隐式时间线、隐式 identity、隐式 diff 口径），只是它们没有被收口成**可导出/可对比/可解释**的结构；现在把这些事实源收敛成“统一最小 IR（Static IR + Dynamic Trace）”，于是概念变得可命名、可验证、可被平台消费，看起来就“更复杂”。

> 经验：当你要做 **出码 / 回写 / 解释 / 回放 / CI 门禁** 时，“隐式简单”最终会以“不可验证的复杂”反噬；把它显式化，复杂度反而可治理。

### 1.2 面向业务的公开 API 是不是几乎没怎么变（顶多多一层 workflow）？

结论：**对业务侧的“日常手写 API”可以几乎不变**；变化主要发生在：

- 新增一个“结构化工作流的 authoring 入口”（目前命名为 `FlowProgram`，未来可能收敛为 `Workflow`）。
- 业务侧“少胶水”的收益主要来自 **Recipe/Studio/AI 的出码**，而不是要求业务同学手写 IR 图。

因此，外观上像是“多了一层 workflow”，但它的第一性目标是：让平台/工具链拿到一个可导出的 Π（控制律）slice，而不是替代 `$.onAction().runLatest(...)` 这种运行时 DSL。

### 1.3 这一层 workflow 未来主要用于承载平台侧出码，而不是直接给用户使用？

是的。075 的定位是 **AI/平台专属出码层（IR DSL）**：

- 平台/Devtools/Alignment Lab 的静态事实源是 `ControlSurfaceManifest`（Root IR），它只收口 slices（workflow/traits/services/actions/opaque）。
- `FlowProgram/Workflow` 作为对外子模块存在，更多是为了提供 DX（validate/export/install），而不是让人类“日常手写爽”。

## 2. 统一链路：从 authoring 到 Root IR，再到运行期证据（0→1 主线）

这条链路的目标不是“增加一堆中间层”，而是解决三个硬问题：

1. **可比对**：同一语义在不同机器/不同时间导出同一工件（字节级稳定）。
2. **可解释**：运行期事件流 Slim，但能回链到静态结构（点事件→定位到哪一个 stepKey/serviceId）。
3. **可回写**：平台能做最小补丁（parser/rewriter），而不是只能全量重写。

### 2.1 全链路总览（推荐口径）

```text
Recipe（可选；压缩输入）
  ↓ expand/normalize（纯数据、确定性）
WorkflowDef（权威输入工件；纯 JSON，可落盘）
  ↓ normalize（去 sugar、补默认、补齐分支数组、补齐 sources 映射）
Canonical AST（唯一规范形；语义规范形）
  ↓ compile（纯数据、确定性；图化）
Workflow Static IR / FlowProgramStaticIr（Π slice；可导出/可 diff）
  ↓ bundle/index（按需：切片附件 + 索引）
ControlSurfaceManifest（Root Static IR；平台单一事实源）
  ↓ compileRuntimePlan（internal；冷路径构建路由/索引）
RuntimePlan（热路径索引；不对外交换）
  ↓ mount/route/interpret（tick 参考系）
Dynamic Trace（Slim；锚点 + 摘要） + Tape（可选；回放）
  ↓ grounding（平台消费）
RunResult（EvidencePackage + static digests + 可选 tape）
```

口径对齐的权威落点：

- 术语与管线名：`docs/ssot/platform/foundation/glossary/04-platform-terms.md`
- Root IR 合同：`docs/ssot/platform/contracts/03-control-surface-manifest.md`
- 075 的数据模型与硬裁决：`specs/075-flow-program-codegen-ir/data-model.md`
- RunResult 静态 digest 字段：`docs/ssot/platform/contracts/01-runresult-trace-tape.md`

### 2.2 每一层到底“负责什么”（以及为什么它不该被别的层吞掉）

下面把每个层级的职责说清楚，并回答“是不是必要”。

#### A) Recipe（可选）

Recipe 的存在只为一件事：**输入压缩**（让平台/AI 用更少 token/更少结构噪声描述常见工作流）。

- 必要性：不是必须；可以直接产出 `WorkflowDef` 或 Canonical AST。
- 禁区：Recipe 不能成为“第二套语义语言”，必须 100% 可确定性展开为 Canonical AST。
- 主要文档：`specs/075-flow-program-codegen-ir/contracts/public-api.md`、`specs/075-flow-program-codegen-ir/quickstart.md`

#### B) WorkflowDef（权威输入工件，必须）

这是平台/LLM/Studio 的**单一事实源输入格式**（纯 JSON、可落盘、可 Schema 校验、版本化）。

- 必要性：必须。没有它，平台侧的“可交换工件”会退化为“只能理解 TypeScript AST / 只能理解运行时对象”。
- 重点：`WorkflowDef` 不是 Static IR，它允许 authoring 的便利字段/语法糖存在，但必须能被归一到 Canonical AST。
- 主要文档：`specs/075-flow-program-codegen-ir/contracts/public-api.md`（SSoT 分化 + DX 一体化）

#### C) Canonical AST（唯一规范形，必须）

这是整条链路的“去歧义层”：同一语义只有一种表示。

- 必要性：必须。否则 digest/diff、parser/rewriter、Devtools 回链都会陷入“同一语义有多种结构表示”的不可比对泥潭。
- 关键不变量（v1）：
  - **无语法糖**：邻接推断不是事实源，分支必须显式结构字段。
  - **默认值落地**：所有默认策略都要物化进 AST（避免运行时推导）。
  - **stepKey 必填且唯一**：缺失/冲突 fail-fast，禁止用数组顺序派生（重排不得漂移）。
- 主要文档：`specs/075-flow-program-codegen-ir/data-model.md#1-canonical-ast-flowprogramcanonicalastv1`

#### D) Workflow Static IR / FlowProgramStaticIr（Π slice，可导出投影，必须）

这是平台/Devtools/Alignment Lab 交换与对比的工作流静态形态：`version + digest + nodes/edges`。

- 必要性：必须。它承担三类“平台化能力”的最小输入：
  - **可解释 diff**（CI/审阅/迁移素材）
  - **静态图索引**（Devtools：事件回链到节点）
  - **冷路径编译**（internal RuntimePlan 的输入）
- 注意：Static IR 必须是“可导出投影”，不能让运行时把 Canonical AST 当热路径真相源去扫描。
- 主要文档：
  - `specs/075-flow-program-codegen-ir/contracts/ir.md`
  - `specs/075-flow-program-codegen-ir/data-model.md#2-static-ir-flowprogramstaticirv1`

#### E) ControlSurfaceManifest（Root Static IR，必须）

Root IR 的目标是“把控制面收口为单一工件”，使平台/Devtools 在不读源码的前提下仍能拿到：

- actions/services/traits/workflows/opaque 的最小索引
- 一把全局入口 digest（`controlSurfaceDigest`）
- slices 挂载（例如 `workflowSurface` 的 digest ref）

为什么一定要有 Root IR：因为平台最终需要对齐的是“整个控制面”，而不只是 workflow。Root IR 是各 slice 的统一入口与一致性证明。

主要文档：`docs/ssot/platform/contracts/03-control-surface-manifest.md`

#### F) RuntimePlan（internal，必须，但不对外）

`RuntimePlan` 的存在只为一件事：**让热路径不依赖 IR 扫描**。

- 必要性：必须。否则你会把“平台化能力”成本摊到 tick/dispatch 热路径，违背 `diagnostics=off` 近零成本的硬约束。
- 边界：它不对外交换，不进入 Root IR，不参与平台 diff；它是 IR 的冷路径编译产物。
- 主要文档：在 075 `plan.md` 与平台 Root IR 合同中均有明确约束（`compileRuntimePlan` 必须是 internal）。

#### G) Dynamic Trace / Tape / RunResult（必须分层）

动态侧必须坚持分层：

- Trace：解释 “why”（Slim、可采样、可丢弃）
- Tape：回放 “how”（只在受控环境开启；记录开放系统的不确定性交换）
- RunResult：平台 grounding（静态 digest + 动态证据壳）

主要文档：`docs/ssot/platform/contracts/01-runresult-trace-tape.md`

## 3. “每一段都必要吗？”——给一个可操作的判断准则

你可以用这组问题来判断“某一层是不是可以删掉”：

1. **如果删掉这层，会不会出现两种不同结构表示同一语义？**  
   - 会 → 这层多半是 Canonical 层/normalize 层，不能删。
2. **如果删掉这层，平台还能不能在不读源码的前提下做增量？**  
   - 不能 → 这层多半是 digest/diff/Root IR 层，不能删。
3. **如果删掉这层，运行时热路径会不会被迫扫描/哈希 IR？**  
   - 会 → 这层多半是 RuntimePlan 层，不能删（但必须 internal）。
4. **如果删掉这层，事件流是不是不得不携带 IR 全量才能解释？**  
   - 是 → 这层多半是 Root IR + 回链索引层，不能删。

在 075 目前的裁决里：

- Recipe：可选（删掉仍可成立）
- WorkflowDef / Canonical AST / Static IR / Root IR / RuntimePlan / Trace：不可删（各自解决一个不可替代的硬问题）

## 4. 剧本集（你要做什么 → 该走哪条链路）

> 说明：部分剧本依赖 079/081/082/083 等后续 spec；本文先把“应当如何对齐”说清楚，便于平台/工具链并行推进。

### A1. 平台出码增量（主要消费：Root IR digest）

**你在解决什么**：codegen 不依赖 git diff，而依赖“语义边界 digest”，从而跨环境可复现、可缓存、可门禁。

**最小流程**：

1. 从仓库/产物拿到 `ControlSurfaceManifest.digest`（或 `workflowSurfaceDigest`）。
2. 以 `codegenVersion + digest` 作为缓存 key：
   - 命中：复用生成物；
   - 未命中：只重生成变化 slice。
3. 变化时产出 diff（结构化 changes）→ 作为迁移说明素材（forward-only）。

关联文档：

- Root IR：`docs/ssot/platform/contracts/03-control-surface-manifest.md`
- digest/diff：`docs/ssot/handbook/tutorials/01-digest-diff-anchors.md`（B2）

### A2. PR/CI 门禁（主要消费：manifest diff + workflow IR diff）

**你在解决什么**：把“结构变化”变成可机器消费的 verdict（PASS/WARN/FAIL），并给人类审阅可解释摘要。

最常用落点已经在教程 01 里写清楚：

- `Reflection.diffManifest`：`docs/ssot/handbook/tutorials/01-digest-diff-anchors.md`（A2）

Workflow IR 的 diff 口径（规划）：以 `FlowProgramStaticIr.digest` 触发，changes 按 `stepKey/programId/serviceId` 分级。

### A3. Devtools 回链（主要消费：Root IR + 索引）

**你在解决什么**：事件流 Slim，但 UI 能做到“点一个事件 → 高亮到具体 stepKey/serviceId/programId”。

最小闭环：

1. RunResult 提供 `static.controlSurfaceDigest`（或 slice digests）
2. Devtools 按 digest 加载 Root IR（或附件）
3. 冷路径建索引：`byActionTag/byServiceId/byProgramId/byStepKey`
4. 消费事件：事件只携带锚点；通过索引回链到结构

关联文档：`docs/ssot/platform/contracts/01-runresult-trace-tape.md`、`docs/ssot/platform/contracts/03-control-surface-manifest.md`

### A4. 全双工回写（Parser/Rewrite）（主要消费：Canonical AST + stepKey）

**你在解决什么**：平台不是“全量重写 TS 文件”，而是做保守的最小补丁回写（并能证明不会 silent corruption）。

关键点：

- Parser/Autofill/Rewrite 只能在 Platform-Grade 子集内工作；
- `stepKey` 是回写的核心稳定锚点（缺失只能保守补全，冲突必须拒绝写回）。

关联 spec：`specs/079-platform-anchor-autofill/*`、`specs/081-platform-grade-parser-mvp/*`、`specs/082-platform-grade-rewriter-mvp/*`

### A5. Sandbox / Alignment Lab（主要消费：RunResult + static digests）

**你在解决什么**：在受控环境里对齐“同一输入 → 同一 Root IR + 同一证据口径”，并为 kernel 对照提供合同门禁。

入口教程：`docs/ssot/handbook/tutorials/05-sandbox-runtime-alignment-lab.md`

### A6. Tape record/replay/fork（主要消费：tick 参考系 + static digests）

**你在解决什么**：Trace 负责解释，Tape 负责确定性回放；Tape 必须能证明“回放的是同一套控制面”。

推荐约束：

- record 时把 `controlSurfaceDigest` 写入 tape header
- replay/fork 时先校验 digest：一致才允许 deterministic replay

关联文档：`docs/ssot/platform/contracts/01-runresult-trace-tape.md`（Trace vs Tape）与 075 `contracts/tape.md`

### A7. FlowProgram vs Workflow 命名一致性（“改名”会牵引哪些决策）

现状：

- 对外子模块命名：`FlowProgram`
- 平台/SSoT 术语：`Workflow`（Π slice / `workflowSurface`）

是否可以内外一致：可以，但会牵引一组需要显式裁决的点（不是简单替换字符串），例如：

- public submodules 的导出名与迁移策略（030）
- 运行时/平台协议字段是否改名（通常不改：例如 `workflowSurface` 已是平台真理源的一部分）
- 文档/示例/索引的同步重命名（避免并行真相源）

改名建议 PR（仅建议，不做兼容层）：`specs/073-logix-external-store-tick/pr.md`

## 5. 代码锚点（Code Anchors）

> 提示：这里列“现在就存在且可点击的落点”；075 的实现代码尚未落地的部分以 spec 为准。

- 术语与管线：`docs/ssot/platform/foundation/glossary/04-platform-terms.md`
- Root IR 合同：`docs/ssot/platform/contracts/03-control-surface-manifest.md`
- RunResult grounding：`docs/ssot/platform/contracts/01-runresult-trace-tape.md`
- 075 数据模型与合同：`specs/075-flow-program-codegen-ir/data-model.md`、`specs/075-flow-program-codegen-ir/contracts/ir.md`
- digest：`packages/logix-core/src/internal/digest.ts`
- manifest/diff：`packages/logix-core/src/internal/reflection/manifest.ts`、`packages/logix-core/src/internal/reflection/diff.ts`
- trial-run：`packages/logix-core/src/internal/observability/trialRunModule.ts`
- tick 参考系（实现入口）：`packages/logix-core/src/internal/runtime/core/TickScheduler.ts`

## 6. 常见坑（Anti-patterns）

- 把“同一语义”允许多种结构表示（缺少 Canonical AST）→ digest/diff 与回写会永久不稳定。
- 让 `stepKey` 缺失/自动派生/靠数组顺序 → 一旦重排就锚点漂移，Devtools/回写/门禁全断链。
- 把运行时对象（Tag/Effect/Fiber/Error/Function）塞进可导出的 IR → 破坏可序列化硬门与跨宿主传输。
- 让时间算子走影子 `setTimeout` → 脱离 tick 参考系，回放与解释断链。
- 在事务窗口内执行 IO（call）→ 违反 txn-window 禁 IO，必须 fail-fast 并产出诊断。

