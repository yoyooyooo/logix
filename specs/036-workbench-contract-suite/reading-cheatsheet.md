# 阅读小抄：从 IR → 画布 → Agent 出码闭环（036 统筹视角）

**Date**: 2025-12-26  
**Scope**: 本小抄只给“阅读顺序 + 你会得到什么”，不重复各 SSoT 的细节；需要细节请按链接下钻。

## 0) 一句话目标

用 **IR-first** 的证据链把平台链路串起来：`IrPage（最小 Workbench） → TrialRun/Artifacts（事实工件） → PortSpec/TypeIR（引用空间） → StageBlueprint（画布语义） → Binding/Assets（投影与表达式） → Contract Suite Verdict/Context Pack（Agent 迭代闭环）`。

## 1) 主线阅读顺序（建议照着点开）

1) IR 全链路（从页面反推到 runtime）  
`docs/ssot/runtime/logix-core/api/07-ir-pipeline-from-irpage.md`  
你会拿到：`IrPage → sandbox compile/run → Observability.trialRunModule → TrialRunReport/Manifest/StaticIR/Evidence` 的实现落点与各 IR 字段语义。

2) IR vs AST（上帝视角：表达能力/可逆性/Agent 出码闭环）  
`docs/ssot/runtime/logix-core/concepts/04-ir-vs-ast-and-agent-coding.md`  
你会拿到：为什么 IR 不是“比 AST 高级”，以及“IR 做裁判、AST/patch 做编辑载体”的组合拳结论。

3) 031：TrialRun artifacts 槽位（统一承载 Supplemental Static IR）  
`specs/031-trialrun-artifacts/quickstart.md`  
`specs/031-trialrun-artifacts/data-model.md`  
你会拿到：`TrialRunReport.artifacts` 的统一 shape、预算/截断/单项失败语义，以及首个 kit 用例 `@logixjs/form.rulesManifest@v1`。

4) 035：PortSpec/TypeIR（平台引用空间 SSoT）  
`specs/035-module-ports-typeir/data-model.md`  
你会拿到：画布连线/绑定/表达式编辑器需要的“逻辑插座”事实源：`@logixjs/module.portSpec@v1`、`@logixjs/module.typeIr@v1` + `PortAddress`（统一寻址基元）。

实现提示：TypeIR 的一个现实实现路线是从 `effect/Schema` 的 `schema.ast`（SchemaAST）投影（SchemaAST 不直接外泄为协议）；现有可参考实现：`packages/logix-core/src/internal/state-trait/converge.ts` 的 `schemaHasPath`。

5) 034：CodeAsset（表达式/校验资产协议）  
`specs/034-expression-asset-protocol/data-model.md`  
你会拿到：表达式/校验如何被固化为可治理资产：`normalizedIr + deps + digest + budgets + anchor`，以及 parseable vs blackbox 的降级语义。

6) 033：StageBlueprint / IntentRule / RowRef（画布语义蓝图）  
`specs/033-module-stage-blueprints/data-model.md`  
你会拿到：画布的最小可配置面：节点=ModuleInstance、边=IntentRule（事件→动作）、列表定位=rowRef（稳定 `$rowId`），以及它们如何引用 034/035 的事实源。

7) 032：UI 投影与 BindingSchema（UI 只做投影）  
`specs/032-ui-projection-contract/data-model.md`  
你会拿到：UIBlueprint 与 BindingSchema 的边界：UI 不承载语义，绑定只允许读自身模块、交互只派发动作/事件。

8) 036：Contract Suite（统一验收口径 + Agent Context Pack）  
`specs/036-workbench-contract-suite/data-model.md`  
`specs/036-workbench-contract-suite/quickstart.md`  
你会拿到：PASS/WARN/FAIL 的统一判定输入域、降级矩阵、以及 `ContractSuiteContextPack@v1`（可选携带 `facts.inputs` 作为 Agent 的最小编辑上下文）。

9) 语义化 UI × 画布编排（插座/插口打通的最小对齐）  
`specs/036-workbench-contract-suite/semantic-ui-port-bridge.md`  
你会拿到：UiPort/UiBinding/UiSignal（草案）如何无缝映射到 `UiBlueprint/BindingSchema/PortSpec/IntentRule`，以及“UI 只接自己、跨模块只走语义边”的打通方案。

## 2) 画布节点都有什么（最小概念面）

以统一概念域 `@logixjs/module.*` 为载体，画布配置面只保留三类“可被 LLM 可靠生成/校验”的对象：

- `@logixjs/module.stageBlueprint@v1`：语义蓝图（模块实例图 + 规则边集合）
- `@logixjs/module.intentRule@v1`：语义边（事件→动作；可选引用 `CodeAssetRef`）
- `@logixjs/module.codeAsset@v1`：表达式/校验资产（固化 deps/digest；可解释失败与预算）

而“可引用空间/类型”必须来自 trial-run 导出（禁止手工配置）：

- `@logixjs/module.portSpec@v1`
- `@logixjs/module.typeIr@v1`

## 3) Agent 出码闭环（平台该怎么用这些 IR）

推荐的 IR-first 闭环（036 统筹口径）：

1. 平台运行 Contract Suite：产出 TrialRunReport + artifacts + Verdict。  
2. 平台生成 `ContractSuiteContextPack@v1`：`facts`（含可选 `facts.inputs`）+ `constraints` + `target`。  
3. Agent 只基于 Context Pack 输出 patch（AST patch / 文本 diff 都可以，AST 只是载体）。  
4. 平台重跑 Contract Suite：用新工件与新 verdict 作为下一轮客观反馈（禁止“模型自评”当裁判）。

## 4) 常用 keys（背下来就够用）

- 试运行/证据链：`TrialRunReport`（025；由 07 文档详述）
- artifacts（031）：`@logixjs/form.rulesManifest@v1`
- 引用空间/类型（035）：`@logixjs/module.portSpec@v1`、`@logixjs/module.typeIr@v1`
- 画布语义（033）：`@logixjs/module.stageBlueprint@v1`、`@logixjs/module.intentRule@v1`、`@logixjs/module.rowRef@v1`
- 投影/绑定（032）：`@logixjs/module.uiBlueprint@v1`、`@logixjs/module.bindingSchema@v1`、`@logixjs/module.presentationState@v1`
- UI Kit Registry（032）：`@logixjs/module.uiKitRegistry@v1`
- 资产（034）：`@logixjs/module.codeAsset@v1`、`CodeAssetRef`（digest）
