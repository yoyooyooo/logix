---
title: Static Governance 教程 · Trait Provenance / 冲突门禁 / 可解释快照（从 0 到 1）
status: draft
version: 1
---

# Static Governance 教程 · Trait Provenance / 冲突门禁 / 可解释快照（从 0 到 1）

> **定位**：本文把“Static Governance（静态治理）”落到仓库里最成熟的一条链路：`ModuleTraits`（023）的 **贡献 → 合并 → 冲突门禁 → 快照 → 安装**。  
> 你会搞清楚：为什么它是“合同门禁”、为什么它必须静态冻结、为什么它能输出稳定 digest、以及 Devtools 如何回答“这条规则来自哪里”。  
> **裁决来源**：关于 023 的实现裁决与术语以 `docs/ssot/runtime/logix-core/impl/05-trait-provenance-and-static-governance.md` 为准；本文负责“讲透链路 + 给剧本 + 给锚点”。

## 0. 最短阅读路径（10 分钟上手）

1. 读「1.1 静态治理的目标：把规则变成合同」：理解“治理”不是加功能，而是把失败前置到 setup。  
2. 读「2.1 Contribution → Finalize → Snapshot → Install」：抓住总链路。  
3. 读「2.3 冲突门禁：Duplicate / Missing Requires / Excludes」：知道哪些会 fail-fast。  
4. 最后读「3.2/3.3」两个剧本：你在真实业务里最常遇到的两个坑。

如果你想先从“IR/Manifest/Diff 的合同门禁”理解为什么平台需要结构工件：先读 `docs/ssot/handbook/tutorials/34-surface-manifests-and-impact-analysis.md`。

## 1. 心智模型（Static Governance 到底是什么）

### 1.1 静态治理的目标：把“业务规则”变成可门禁的合同（Contract Gate）

在 Logix 语境里，Static Governance 不是“更多抽象”，而是一个非常具体的工程目标：

- **把规则的存在与来源固化为静态事实**：能回答“它是谁声明的/在哪里声明的”。  
- **把规则冲突变成可机器门禁**：在 **setup/装配期 fail-fast**，而不是等到运行期黑盒行为出现。  
- **把治理结果变成可导出的最小工件**：JSON 可序列化、可 diff、可打 digest，用于 Devtools/CI/平台。

这类合同门禁的共同特征：

- **输入**：声明式的“贡献（contribution）”。  
- **编译**：在冷路径把贡献合并成“最终形态（merged）”。  
- **门禁**：发现冲突立即失败，并输出结构化原因（不是靠截断的 error message）。  
- **工件**：产出可导出快照（snapshot），用稳定 digest 标记，供对齐与对比。

### 1.2 为什么是“静态”：拒绝 Runtime Listeners 的根因

如果允许运行期“监听 trait 变化并动态重建图”，会引入三类不可控成本（023 明确拒绝）：

1. **确定性崩塌**：同一份源码定义在单实例内出现多版本语义，digest/IR 对齐失效。  
2. **事务窗口污染**：图构建/依赖分析开销不可控，且会把昂贵操作推到热路径。  
3. **可诊断性退化**：错误推迟到运行期出现，复现与定位都更难。

因此：治理发生在 setup；运行时只执行已经构建好的 Program/Plan（Graph Execution）。

### 1.3 静态治理的“最小输出”应该包含什么

以 023 `ModuleTraitsSnapshot` 为例，一个合格的静态治理快照至少要同时满足：

- **可解释**：`provenanceIndex[traitId]` 给出 `originType/originId/path`。  
- **可对比**：`traits[]` 顺序稳定（同输入同序）。  
- **可锚点化**：`digest` 由稳定字段计算，能作为 drift detection 与 join key。  
- **可裁剪**：运行期事件中可以只带 `{digest,count}`（light），需要深挖再升档位（full）。

## 2. 核心链路（从 0 到 1：Contribution → Gate → Snapshot → Install）

本节把 023 的链路按“谁生产/谁合并/谁门禁/谁消费”拆开讲。

### 2.1 Contribution：所有来源统一成 TraitContribution

事实源：

- 合同数据结构：`packages/logix-core/src/internal/runtime/core/ModuleTraits.ts`
  - `TraitContribution = { traits: TraitSpec; provenance: TraitProvenance }`
  - `TraitProvenance = { originType, originId, originIdKind, originLabel, path? }`

两类贡献入口（都发生在 setup）：

1. **Module-level 贡献（module 图纸层）**
   - 入口：`packages/logix-core/src/ModuleTag.ts`
   - 来源：`ModuleTag.make(id, { traits })`（`def.traits`）
   - provenance：`originType="module"`, `originId=<moduleId>`, `originIdKind="explicit"`

2. **LogicUnit-level 贡献（logic 单元层）**
   - 入口：`packages/logix-core/src/internal/runtime/core/BoundApiRuntime.ts` → `$.traits.declare(traits)`
   - 强约束：run 期调用会抛 `LogicPhaseError(code="traits_declare_in_run")`
   - provenance：来自 LogicUnitMeta（`logicUnitId/logicUnitLabel/path`），用于回链到“哪个逻辑单元声明了它”

> 直觉：Static Governance 的第一步就是“统一输入形态”。只要贡献入口收敛，后续所有 gate/export/diff 都能复用。

### 2.2 Finalize：一次性合并 + 冻结（freeze），得到 merged + snapshot

事实源：

- 合并与冲突检测：`packages/logix-core/src/internal/runtime/core/ModuleTraits.ts` → `finalizeTraitContributions`
- 执行点（初始化 logic）：`packages/logix-core/src/ModuleTag.ts` → `traits:finalize`

`finalizeTraitContributions({ moduleId, contributions })` 做三件事：

1. **合并（merge）**：把所有 contribution 的 `traits` 合并为 `merged`（record）。  
2. **门禁（gate）**：检测冲突（见 2.3），有冲突直接抛 `ModuleTraitsConflictError`。  
3. **快照（snapshot）**：生成 `ModuleTraitsSnapshot`：
   - `traits[]`：最小条目清单（`traitId/name/description?`），排序稳定
   - `provenanceIndex`：`traitId -> provenance`
   - `digest`：`mtraits:023:${fnv1a32(stableStringify({ moduleId, traits, provenanceIndex }))}`

随后，`ModuleTag.ts` 会：

- `internals.traits.setModuleTraitsSnapshot(snapshot)`：把快照挂到 runtime internals（供 Debug/Devtools/TrialRun 读取）。  
- `internals.traits.freezeModuleTraits()`：冻结贡献入口，禁止后续再 register（防止运行期漂移）。  

### 2.3 冲突门禁（Contract Gate）：Duplicate / Missing Requires / Excludes

冲突检测发生在 finalize 阶段，属于“装配错误”，应 fail-fast（而不是 warning）。

事实源：`packages/logix-core/src/internal/runtime/core/ModuleTraits.ts`

#### 2.3.1 Duplicate（`duplicate_traitId`）

- 判定：同一 `traitId` 出现在多条 contribution 中（module 与 logicUnit 混用也算）。  
- 输出：冲突 `sources[]` 包含所有 provenance（去重 + 稳定排序）。  
- 含义：同一条规则被声明了多次，属于“合同冲突”，必须人工裁决（合并/改名/拆模块）。

#### 2.3.2 Missing Requires（`missing_requires`）

- 判定：若 trait value 是 object，且包含 `requires: string[]`，则这些依赖 traitId 必须同时存在；缺失则冲突。  
- 输出：`missing[]` 去重排序；`sources[]` 只包含当前 trait 自己的 provenance。  
- 含义：规则依赖未满足（常见于 feature kit 拆分后忘记带上前置 trait）。

#### 2.3.3 Excludes Violation（`excludes_violation`）

- 判定：若 trait value 包含 `excludes: string[]`，表示这些 traitId 不能与当前 traitId 共存；一旦共存则冲突。  
- 输出：`present[]`（冲突的那批 traitId）+ `sources[]`（当前 trait + 被排斥 trait 的 provenance）。  
- 含义：两条规则语义互斥，不允许在同一模块最终形态中同时出现。

### 2.4 可解释输出：trace 事件与 Debug API

Static Governance 的关键不是“抛错”，而是“抛错同时给解释链路”。

事实源：

- `packages/logix-core/src/ModuleTag.ts`
  - 成功：发 `trace:module:traits`（light 只带 `{digest,count}`；full 带 `traits+provenanceIndex`）
  - 失败：若是 `ModuleTraitsConflictError` 且 diagnostics 非 off，则发 `trace:module:traits:conflict`
- `packages/logix-core/src/Debug.ts`
  - `getModuleTraitsSnapshot(runtime)`：读到最终快照
  - `getModuleFinalTraits(runtime)`：把快照投影成“可枚举 trait 清单 + provenance”

> 关键原则：不要依赖截断的 error message；让 conflict/trace 事件成为平台与 Devtools 的机器事实源。

### 2.5 Install：把 merged spec 编译成 Program（图），运行时只执行 Program/Plan

事实源：`packages/logix-core/src/ModuleTag.ts`

- 若 `merged` 为空：跳过（不安装 program）。  
- 构造 Program：`StateTrait.build(stateSchema, merged)`（若只有 module-level contribution 且 `baseProgram` 已建好，则复用以避免重复 build）。  
- 安装到运行时：`StateTrait.install($, program)`。  

这一步对应 023 的核心裁决：运行时只消费 Program/Plan，不监听 traits 定义的变化。

## 3. 剧本集（用例驱动）

### 3.1 剧本 A：我做了一个 Feature Kit，想把一组规则“可治理地”注入到模块里

推荐路线：

1. 以 **logicUnit-level** 的方式注入：在 setup 期用 `$.traits.declare({...})` 声明（提供稳定 logicUnit id/source）。  
2. 给每条 trait 提供 `name/description`（可读性提升，且不影响执行语义）。  
3. 如有依赖关系，把它写成 `requires`（让冲突门禁能 fail-fast）。  

你将获得：

- 装配期就能看到 `trace:module:traits` 的快照 digest；  
- Devtools 能回答“这条规则来自哪个逻辑单元”；  
- 未来重构时，可用 digest/diff 检测规则漂移。

### 3.2 剧本 B：升级后突然报 Duplicate——我该怎么定位“是谁声明了第二份”

你会看到两条线索（任选其一）：

1. `trace:module:traits:conflict`（diagnostics=full 时包含 `conflicts[]` 全量 provenance）  
2. 直接读 Debug API：`Debug.getModuleTraitsSnapshot(runtime).provenanceIndex[traitId]`（但注意：Duplicate 会在 finalize 直接 fail-fast，可能拿不到运行期 runtime）

定位与修复建议：

- 如果两条来源都来自 module-level（两个 module-level traits 合并）：把 traitId 改名或收敛到单处。  
- 如果来自 module-level + logicUnit-level：通常表示“该 traitId 应该只由 kit 声明一次”，把 module-level 的那份移除。  
- 如果来自两个 logicUnit-level：考虑把它们拆成不同 traitId，并用 `requires/excludes` 表达语义关系。

### 3.3 剧本 C：缺失 requires——我希望错误更像“依赖缺失报告”，而不是运行期黑盒

做法：

- 对 trait value 明确写 `requires: ['x', 'y']`。  
- 让缺失变成 finalize 的门禁冲突：`missing_requires`。  

收益：

- 错误会指向“缺哪些 traitId”，且 sources 能回链到“是谁声明了该 trait”。  
- CI/平台可以把这类冲突归类为“装配错误”，不必跑到运行期才发现逻辑不生效。

### 3.4 剧本 D：我想给平台做“静态治理面板”，要展示哪些字段才算够用

最小字段集建议：

- `moduleId`（语义锚点）  
- `digest`（快照锚点，用于对比/缓存/跳转）  
- `traits[]`（只要 `traitId/name/description?`，顺序必须稳定）  
- `provenanceIndex`（`originType/originId/originLabel/path?`）  

并遵循“light/full 分层”：

- 默认只展示 `digest + count`，需要时再按 digest 拉取 full（避免默认成本与体积税）。

## 4. 代码锚点（Code Anchors）

1. `docs/ssot/runtime/logix-core/impl/05-trait-provenance-and-static-governance.md`：023 裁决性实现备忘（本文上游）。  
2. `packages/logix-core/src/internal/runtime/core/ModuleTraits.ts`：TraitProvenance/Snapshot、finalize 合并与冲突门禁、digest 计算。  
3. `packages/logix-core/src/internal/runtime/core/BoundApiRuntime.ts`：`$.traits.declare`（setup-only）与 provenance 注入。  
4. `packages/logix-core/src/ModuleTag.ts`：traits:finalize logic、freeze、trace:module:traits / conflict 事件。  
5. `packages/logix-core/src/Debug.ts`：`getModuleTraitsSnapshot/getModuleFinalTraits`（给脚本/断言/Devtools 读取）。  
6. `packages/logix-core/src/internal/runtime/core/DebugSink.record.ts`：`trace:module:traits*` 的 Slim 投影策略（light/full）。  

## 5. 验证方式（Evidence）

最小验证建议（不追求“跑全仓”）：

1. **确定性**：同一份 module 定义重复装配，`ModuleTraitsSnapshot.digest` 必须一致。  
2. **门禁**：构造一个 Duplicate / Missing Requires / Excludes 的最小用例，确认 finalize 期 fail-fast（且 diagnostics=full 能看到 conflict 结构）。  
3. **可解释性**：`Debug.getModuleFinalTraits(runtime)` 输出的 `provenance` 能回链到你提供的 `logicUnitId/source`。  

## 6. 常见坑（Anti-patterns）

- 把“规则变更”当成运行期能力：试图在 run 期调用 `$.traits.declare`（会直接触发 phase error）。  
- 让 traitId 依赖数组顺序/随机数派生：会造成 digest 漂移与 diff 噪音。  
- 用 try/catch 吞掉 `ModuleTraitsConflictError`：会把装配错误推迟到运行期黑盒。  
- 只写 error message，不发结构化 trace/diagnostic：平台与 Devtools 只能做文本解析，无法稳定门禁。  
