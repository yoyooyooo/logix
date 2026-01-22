---
title: Playground-as-Executable-Spec 教程 · 把教程变成可运行的合同（从 0 到 1）
status: draft
version: 1
---

# Playground-as-Executable-Spec 教程 · 把教程变成可运行的合同（从 0 到 1）

> **定位**：本文回答一个“文档体系升级”的目标：  
> **让教程不只是文字，而是可运行的合同（Executable Spec）**——新成员照着跑能看到同样的证据链；老成员回味时能复现关键链路与不变量。  
> **裁决来源**：Playground 的平台定位在 `docs/specs/drafts/topics/sandbox-runtime/65-playground-as-executable-spec.md`；RunResult/Trace/Tape 的契约在 `docs/ssot/platform/contracts/01-runresult-trace-tape.md`；本文把它落到开发者可执行的路线。

## 0. 最短阅读路径（10 分钟上手）

1. 读方法论草案：`docs/specs/drafts/topics/sandbox-runtime/65-playground-as-executable-spec.md`（Playground=Executable Spec Lab）。  
2. 读 RunResult 契约：`docs/ssot/platform/contracts/01-runresult-trace-tape.md`（grounding 输出口径）。  
3. 看现有原型落点：`examples/logix-sandbox-mvp/src/ir/IrPage.tsx`（IR page 反推全链路的入口）。  
4. 然后回到本文看「2.2 最小可运行教程模板」：你可以据此把每篇教程都变成“可跑的剧本”。

## 1. 心智模型（为什么要把教程做成可执行）

### 1.1 纯文本教程的极限：无法验证、无法对齐、无法回放

当教程越来越多、链路越来越长，纯文本会遇到三类问题：

- 新成员“看懂了”，但无法确认理解是否正确；  
- 老成员“记得大概”，但细节随实现演进而漂移；  
- 平台/Devtools/CI 想复用这些知识时，没有可机器消费的证据闭环。

Executable Spec 的目标是：

- 教程描述的链路能被运行出来；  
- 运行产生的证据（IR/trace/对齐报告）能被校验与存档；  
- 未来改动能用同一条跑道做回归（不靠记忆）。

### 1.2 Executable Spec 的最小闭环：Scenario → RunResult → Alignment Report

在本仓语境里，一个“可执行教程/剧本”至少需要三样东西：

1. **Scenario（场景输入）**：用例步骤（可来自 spec、也可来自 UI_INTENT 录制）。  
2. **RunResult（grounding）**：Sandbox 运行产物（logs/traces/uiIntents/stateSnapshot…）。  
3. **Alignment Report（对齐报告）**：把“应该如何（Spec/IntentRule）”与“实际上如何（RunResult）”做结构化比对，指出覆盖与偏差。

这些概念与数据模型占位见：`docs/specs/drafts/topics/sandbox-runtime/65-playground-as-executable-spec.md`。

## 2. 核心链路（从 0 到 1：如何把一篇教程变成“可跑合同”）

### 2.1 选一个“可控场景”做样板：RegionSelector（省市区联动）

仓库已有 Sandbox MVP 场景（可作为样板）：

- `examples/logix-sandbox-mvp/*`

它具备 Executable Spec 的最小要素：

- Worker sandbox 运行（@logixjs/sandbox）  
- IR Page（manifest/staticIr/evidence）面板  
- UI_INTENT（线框/语义 UI）能力占位

### 2.2 最小可运行教程模板（建议约定）

对 handbook 下的每篇“核心链路教程”，建议绑定一个最小可运行剧本，固定四件事：

1. **入口**：一个可运行页面/脚本（例如 IrPage/ScenarioRunner）。  
2. **输入**：一个 ScenarioSpec（或脚本化步骤）作为固定输入。  
3. **输出**：固定收集一组工件：
   - `ControlSurfaceDigest` / `ModuleManifest.digest` / `StaticIr.digest`（静态）  
   - `EvidencePackage`（动态）  
   - `RunResult`（grounding）  
4. **断言**：最小对齐断言（例如：某些 trace 类型必须出现、某些 digest 必须稳定、某些 UI_INTENT 必须按顺序出现）。

这样教程就不再是“解释”，而变成“可验证合同”。

### 2.3 把“教程里的 Code Anchors”升级成“可点击 + 可验证”的链路

教程通常会列出：

- 代码锚点（packages/* 文件）  
- 协议锚点（docs/ssot / specs/contracts）

Executable Spec 的升级点是：

- 这些锚点能在运行时被证据引用（digest/anchors/pointer）；  
- UI/CI 能用这些锚点做跳转与门禁，而不是依赖肉眼读代码。

例如：

- Manifest 面板用 `manifest.staticIr.digest` 跳到 StaticIR 面板；  
- Debug 事件用 `moduleId/txnSeq/opSeq` 回链到 transaction；  
- UI_INTENT trace 用 `meta.stepId/storyId` 回链到场景步骤。

## 3. 剧本集（怎样把它用于“新成员上手 + 老成员回味”）

### 3.1 剧本 A：新成员上手 ——照着教程跑，看到同一条证据链

路线：

1. 先读教程（文字心智模型）  
2. 再跑绑定的 Scenario（Executable Spec）  
3. 在 IR/Trace/Views 面板里对照教程的“应该看到什么”  

收益：

- 学习从“读懂”变成“跑通”；  
- 误解会以证据差异的形式暴露（而不是靠口头对齐）。

### 3.2 剧本 B：老成员回味 ——遇到大改动时，用同一剧本做回归

当你重构核心路径（事务窗口/诊断协议/IR 版本）时：

- 先跑一遍该教程绑定的 Scenario，采集 before evidence；  
- 改动后再跑，采集 after evidence；  
- 用 digest/diff 判定漂移点，并写 migration/解释链路。

这与“性能证据闭环”的思路一致，只是这里是“语义/证据闭环”。

### 3.3 剧本 C：CI 合同门禁 ——把教程剧本变成 PR 的可执行验收

当 Scenario 足够稳定时，可以在 CI 做：

- TrialRun + Manifest/Diff（静态门禁）  
- EvidencePackage 的关键事件存在性断言（动态门禁）  
- （可选）Tape/Replay（受控环境）

这样“教程里的不变量”就从文字变成可执行 gate。

## 4. 代码锚点（Code / Doc Anchors）

1. `docs/specs/drafts/topics/sandbox-runtime/65-playground-as-executable-spec.md`：方法论与数据模型占位（权威草案）。  
2. `docs/ssot/platform/contracts/01-runresult-trace-tape.md`：RunResult/Trace/Tape 契约。  
3. `examples/logix-sandbox-mvp/src/ir/IrPage.tsx`：IR Page 入口（反推全链路）。  
4. `packages/logix-sandbox/src/Types.ts`：RunResult/TraceSpan/UiIntentPacket。  
5. `packages/logix-core/src/Reflection.ts` 与 `packages/logix-core/src/internal/observability/trialRunModule.ts`：静态/试跑证据提取入口。  

## 5. 验证方式（Evidence）

最小“可执行教程”验收建议：

- 同一输入多次运行：digest/排序/关键事件序列稳定（确定性）。  
- 输出预算可控：证据超限必须可解释降级（不是 silent drop）。  
- 失败可行动：对齐失败报告能指回锚点（moduleId/stepKey/pointer）与修复建议。  

## 6. 常见坑（Anti-patterns）

- 把 Playground 做成“能跑就行”的 Runner：缺少 IR/证据/对齐报告就无法成为 Executable Spec。  
- 把可执行剧本和业务 IO 绑死：无法在受控环境复现（应该用 Sandbox mock/spy/tape）。  
- 输出不稳定：靠随机 id/当前时间做锚点，会让任何回归对比都失效。  
