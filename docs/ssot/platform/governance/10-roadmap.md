---
title: Logix & Platform · Roadmap
status: living
---

> 作用：作为「Logix Runtime + 平台侧 Intent & 出码」阶段性的对齐文档，用于在规划期持续校准节奏与优先级。
> 关注范围：当前阶段（意图显影 + 单向出码），为后续「全双工编排 / 自愈架构」铺路。

## 0. 总目标（当前阶段）

- 以三位一体模型（UI / Logic / Module）为基础，
  建立一条 **「业务需求 → 需求意图 → 开发意图 → Logix 代码」的可落地链路**。
- 打磨一套足够表达真实项目的 **Logix Runtime + Intent API（L1/L2/L3）**，
  并验证其在典型 ToB 场景中的「可表达性 + 可维护性」。
- 在平台侧先跑通 **平台 → 出码**（单向），
  同时为未来的 **Code → IntentRule → 图（双向）** 预留结构化锚点（IntentRule / L1/L2/L3 规则形态）。

## 1. 设计约束与不变量

1. **文档先于实现**
   - 任何涉及 Intent 模型、Logix Runtime、平台交互的变更，必须先在 `docs/ssot/platform` 中达成共识，再进入示例/实现代码。
   - SSoT 优先级以 `foundation/00-overview.md` 的规则为准。

2. **Effect-Native & Intent-Friendly**
   - Runtime 以 Effect-TS 为唯一执行引擎，API 设计遵守 A/E/R 泛型顺序与 Env 逆变规则；
   - Intent / Flow / IntentRule 一律以“易被 LLM 和 Parser 理解”为前提（尽量语义化命名 + 限定可解析子集）。

3. **先平台→出码，后全双工**
   - 当前阶段不以“完全双向同步”作为硬目标，但所有生成的代码应当 **结构上可被解析回 IntentRule**；
   - Code→Graph 的实现可以滞后，但不能因为短期实现而破坏长期可解析性。

4. **Runtime 优先可表达性，不做 premature micro-optim**
   - 在典型业务场景下优先保证“能写清楚、能拆开、能调试”，性能优化放在运行稳定后集中处理。

## 2. 分阶段路线图（当前阶段内部）

### Phase A：收敛模型与 API（已完成大部分）

目标：把「说话方式」统一好。

- 模型层：
  - 三位一体模型：`foundation/03-trinity-and-layers.md`；
  - 资产结构：`assets/00-assets-and-schemas.md`；
  - 长期蓝图：`decisions/blueprint.md` + `01-platform-manifesto.md`。
- Runtime & Intent API：
  - Logix 核心：`docs/ssot/runtime/logix-core/api/02-module-and-logic-api.md`、`docs/ssot/runtime/logix-core/api/03-logic-and-flow.md`；
  - Intent 原语（L1/L2）：以 Fluent DSL（`$.onState / $.onAction / $.on + $.state/dispatch`）表达的标准规则，在 IR 中映射为 L1/L2 IntentRule；
  - 平台 IR：`docs/ssot/runtime/logix-core/platform/06-platform-integration.md` 中的 `IntentRule`。
- 平台视角：
  - 视图体系与交互原则：`docs/specs/sdd-platform/workbench/ui-ux/00-platform-ui-and-interactions.md`；
  - Intent & UX 规划（平台骨架索引）：`docs/specs/sdd-platform/workbench/20-intent-rule-and-ux-planning.md`。

✅ 本阶段主要工作已完成，后续只需跟随演进做增量修订。

### Phase B：打实 Logix Runtime 表达力（当前重点）

目标：用 Logix + Intent API 把“真实业务场景”写顺手。

1. **补齐示例场景矩阵（examples/logix）**
   - 列出 5–10 个来自真实项目的典型场景（建议分类）：
     - 搜索 + 详情 / 列表 + 过滤；
     - 审批流 / 提交流程；
     - 长任务 / 导出 / Job；
     - 跨 Store 协作（全局事件 / 多模块同步）；
     - 复杂表单联动。
   - 每类至少用 Logix + Fluent DSL 写出一个可运行示例：
     - 单 Store 内优先用 `$.onState / $.onAction + $.state.update/mutate` + Flow + Pattern；
     - 跨 Store 用 `$.use(StoreSpec) + Fluent DSL（$Other.changes/… → $SelfOrOther.dispatch）`；
     - 需要 Service/后端 Flow 的地方用 Pattern + Effect.Service。

2. **Runtime 能力收敛到 logix-* 包**
   - 将在 `examples/logix` 中证明有效的写法，下沉为 `packages/logix-core`（必要时联动 `packages/logix-react`/`packages/logix-sandbox`）中的公共 Helper / Layer 组合；
   - 确保 `docs/ssot/runtime/logix-core/api/*`（特别是 `02-module-and-logic-api.md` / `03-logic-and-flow.md`）紧跟这些能力更新。

3. **每轮示例演练后的回写与反思**
   - 对每个示例：记录“哪些地方写起来不顺手”“哪些模式被反复 copy-paste”；
   - 讨论是否：
     - 上升为新的 Intent 原语 / Pattern；
     - 或者是模型设计问题，需要调整 Store/Logic/Pattern/IntentRule 的角色划分。

产出：
- 一套覆盖典型场景的 `examples/logix/src/scenarios`；
- `docs/ssot/runtime/logix-core/` 文档中对这些模式的总结与推荐用法；
- 初步验证“Logix + Intent API”在真实场景下的可表达性与可维护性。

### Phase C：薄版平台 → 出码（MVP）

目标：在不重工程量的前提下，打通「平台规则配置 → IntentRule → TS 代码」链路。

1. **IntentRule → 代码的最小生成器**
   - 输入：手写或 UI 生成的 `IntentRule` JSON；
   - 输出：
     - 标准化的 `*.logic.ts`（或场景文件）里的 Fluent DSL / Flow 调用；
     - 必要的 import / Tag / Shape 引用。
   - 优先支持：
     - L1：生成 L1 IntentRule（self.state/self.action → self.mutate）；
     - L2：生成 L2 IntentRule（A.state/A.action → B.dispatch）；
     - 简单 pipeline：生成 `flow.debounce/filter/runLatest` 组合。

2. **规则表视图（IntentRule Explorer）MVP**
   - 最简 UI：
     - 一个规则表格（每行是一条 IntentRule）+ 新建/编辑表单；
     - 一个“生成/更新 TS 文件”的按钮。
   - 暂时不做 Galaxy 画布，只用表格/表单验证：
     - PM/开发在 UI 上调整规则 → 生成代码 → 在 IDE 中查看 / 调整 → 运行示例。

3. **与示例场景集成**
   - 选 `examples/logix` 中 1–2 个场景，先用手写规则，再用 UI 填表单生成规则和代码；
   - 对比两种方式体验，收集“平台侧出码”的真实反馈。

产出：
- 一个可以运行的 “IntentRule → TS” 生成脚本/服务；
- 一个可用的规则表 UI（哪怕是简陋的内部工具）；
- 一套被平台出码覆盖的示例场景，用于后续 Galaxy 画布的验证基础。

### Phase D：为全双工打锚（不急实现，先留钩子）

目标：不给未来的 Code→Graph 挖坑，而不是现在就实现完双向同步。

1. **约束 可解析子集 的代码风格**
   - 对 Intent API 使用定义简单约束：
     - 一条规则对应一个 IntentRule（不再要求有对应的 `Intent.*` 调用）；
     - 避免在单个 Effect.gen 里把多个规则写成互相交错的 if/loop；
     - Intent.react / Flow 组合先限制在少量可解析模式。
   - 用 ESLint / 自定义检查脚本提示越界用法。

2. **最小版 Code→IntentRule 解析器**
   - 针对现有示例代码，实现一个基于 ts-morph 的简单 Parser：识别 Fluent DSL（`$.onState` / `$.onAction` / `$.on`）调用并还原为 IntentRule；
   - 用于验证：
     - 现有代码是否大部分落在可解析子集内；
     - 哪些写法需要特别处理或打上 Gray/Black Box 标记。

3. **与 Blueprint 对齐时间**
   - 根据 `decisions/blueprint.md` 中对全双工节奏的安排，将解析器/可视化调试排入后续阶段，而不在当前阶段强求交付。

## 3. 阶段内的决策原则

在本 Roadmap 执行过程中，遇到“要不要做 X / 怎么做 X”的问题时，可以先对照：

1. **是否破坏 Intent 模型 / Runtime 语义？**
   - 如有冲突，先回到 `foundation/03-trinity-and-layers.md`、`assets/00-assets-and-schemas.md`、`docs/ssot/runtime` 修模型，再动实现。

2. **是否有助于 Logix 表达真实场景？**
   - Phase B 优先：能让 1–2 个真实业务场景“写顺手”的改动优先级高于纯理论上的优雅。

3. **是否降低未来平台→出码 / Code→Graph 的难度？**
   - 优先选择结构化、易解析的 API 形态，即便写起来稍微啰嗦一点。

4. **是否可以先在示例中验证，再沉淀为规范？**
   - 新 API / 新 Pattern / 新 IntentRule 类型，统一先在 `examples/logix` 中试验，再升级到 `docs/ssot/runtime` / 主规格文档。

本 Roadmap 本身也是“living document”：
- 每完成一个 Phase 或经历一次较大方向调整时，应回到本文件更新目标与优先级；
  - 若 Roadmap 与 `foundation/00-overview.md` / `docs/ssot/runtime` / `docs/specs/sdd-platform/workbench/*` 规范产生冲突，以这些 SSOT 为准，并同步修订本文件。

## 4. 实现备忘与风险前移

从当前阶段收尾开始，平台与运行时在讨论「复杂架构级 API」时（例如 应用级 Runtime（`Logix.Runtime.make` + 分形模块体系）、Logic Middleware、生命周期钩子、双向同步解析器），需要**同步思考与记录其实现细节和潜在隐患**，避免后续落地时跑偏。

具体约定：

- **运行时侧**：
  - 所有围绕 `ModuleDef` / AppRuntime / Module 展开、以及 Logic Middleware、Store 生命周期的实现思路与取舍，沉淀在 `docs/ssot/runtime/logix-core/impl/` 下（例如 `01-app-runtime-and-modules.md`、`02-logic-middleware-and-aop.md`）；
  - 这些文档可以比 core/ 规范更细、更工程化，但一旦发现与核心规范冲突，应先修 core/ 再修 impl/。

- **平台侧**：
  - 围绕 Universe View / Galaxy View、IntentRule ↔ TS 代码生成、AOP 配置与可视化等能力的解析/生成逻辑，沉淀在 `docs/specs/sdd-platform/impl/` 下（例如 `app-and-universe-view.md`、`intent-rule-and-codegen.md`）；
  - 平台实现者在设计解析器与出码链路时，优先查阅这些实现备忘，并在方案确定后回写主规格（`docs/specs/sdd-platform/workbench/*` 与 `docs/ssot/runtime/logix-core/`）。

目标是：**在规划阶段就把可能踩坑的点前移到文档中**，让后续实现工作尽量是在“有地基的施工”，而不是在开发中临时拍板核心架构决策。
