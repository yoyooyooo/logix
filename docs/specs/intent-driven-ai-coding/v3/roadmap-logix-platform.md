---
title: Logix & Platform · Roadmap (v3)
status: draft
version: 1
---

> 作用：作为「Logix Runtime + 平台侧 Intent & 出码」阶段性的对齐文档，用于在规划期持续校准节奏与优先级。  
> 关注范围：v3 阶段（意图显影 + 单向出码），为后续 v4 全双工 / v5 自愈铺路。

## 0. 总目标（v3 阶段）

- 以 v3 三位一体模型（UI / Logic / Domain）为基础，  
  建立一条 **「业务需求 → 需求意图 → 开发意图 → Logix 代码」的可落地链路**。  
- 打磨一套足够表达真实项目的 **Logix Runtime + Intent API（L1/L2/L3）**，  
  并验证其在典型 ToB 场景中的「可表达性 + 可维护性」。  
- 在平台侧先跑通 **平台 → 出码**（单向），  
  同时为未来的 **Code → IntentRule → 图（双向）** 预留结构化锚点（IntentRule / Intent.*）。

## 1. 设计约束与不变量

1. **文档先于实现**  
   - 任何涉及 Intent 模型、Logix Runtime、平台交互的变更，必须先在 `docs/specs` v3 体系中达成共识，再进入 PoC / 运行时代码。
   - SSOT 优先级以 `v3/01-overview.md` 第 7 节的规则为准。

2. **Effect-Native & Intent-Friendly**  
   - Runtime 以 Effect-TS 为唯一执行引擎，API 设计遵守 A/E/R 泛型顺序与 Env 逆变规则；  
   - Intent / Flow / IntentRule 一律以“易被 LLM 和 Parser 理解”为前提（尽量语义化命名 + 限定可解析子集）。

3. **先平台→出码，后全双工**  
   - v3 阶段不以“完全双向同步”作为硬目标，但所有生成的代码应当 **结构上可被解析回 IntentRule**；  
   - Code→Graph 的实现可以滞后，但不能因为短期实现而破坏长期可解析性。

4. **Runtime 优先可表达性，不做 premature micro-optim**  
   - 在典型业务场景下优先保证“能写清楚、能拆开、能调试”，性能优化放在运行稳定后集中处理。

## 2. 分阶段路线图（v3 内部）

### Phase A：收敛模型与 API（已完成大部分）

目标：把「说话方式」统一好。

- 模型层：  
  - v3 三位一体模型：`v3/02-intent-layers.md`；  
  - 资产结构：`v3/03-assets-and-schemas.md`；  
  - 长期蓝图：`blueprint.md` + `00-platform-manifesto.md`。
- Runtime & Intent API：  
  - Logix 核心：`runtime-logix/core/02-store.md`、`03-logic-and-flow.md`；  
  - Intent 原语（L1/L2）：`Intent.andUpdate*` / `Intent.Coordinate.*` in `effect-poc/shared/logix-v3-core.ts`；  
  - 平台 IR：`runtime-logix/core/06-platform-integration.md` 中的 `IntentRule`。
- 平台视角：  
  - 视图体系与交互原则：`v3/06-platform-ui-and-interactions.md`；  
  - Intent & UX 规划 + L0–L3 资产链路：`v3/platform/README.md`。

✅ 本阶段主要工作已完成，后续只需跟随演进做增量修订。

### Phase B：打实 Logix Runtime 表达力（当前重点）

目标：用 Logix + Intent API 把“真实业务场景”写顺手。

1. **补齐 PoC 场景矩阵（effect-poc）**
   - 列出 5–10 个来自真实项目的典型场景（建议分类）：  
     - 搜索 + 详情 / 列表 + 过滤；  
     - 审批流 / 提交流程；  
     - 长任务 / 导出 / Job；  
     - 跨 Store 协作（全局事件 / 多模块同步）；  
     - 复杂表单联动。  
   - 每类至少用 Logix + `Intent.*` 写出一个 PoC：  
     - 单 Store 内优先用 `Intent.andUpdate* + Flow + Pattern`；  
     - 跨 Store 用 `Intent.Coordinate.*`；  
     - 需要 Service/后端 Flow 的地方用 Pattern + Effect.Service。

2. **Runtime 能力收敛到 effect-runtime-poc**
   - 将在 effect-poc 中证明有效的写法，下沉为 `packages/effect-runtime-poc` 中的公共 Helper / Layer 组合；  
   - 确保 runtime-logix 文档（特别是 `02-store` / `03-logic-and-flow`）紧跟这些能力更新。

3. **每轮 PoC 后的回写与反思**
   - 对每个 PoC：记录“哪些地方写起来不顺手”“哪些模式被反复 copy-paste”；  
   - 讨论是否：  
     - 上升为新的 Intent 原语 / Pattern；  
     - 或者是模型设计问题，需要调整 Store/Logic/Patter/IntentRule 的角色划分。

产出：  
- 一套覆盖典型场景的 `v3/effect-poc/scenarios`；  
- runtime-logix 文档中对这些模式的总结与推荐用法；  
- 初步验证“Logix + Intent API”在真实场景下的可表达性与可维护性。

### Phase C：薄版平台 → 出码（MVP）

目标：在不重工程量的前提下，打通「平台规则配置 → IntentRule → TS 代码」链路。

1. **IntentRule → 代码的最小生成器**
   - 输入：手写或 UI 生成的 `IntentRule` JSON；  
   - 输出：  
     - 标准化的 `*.logic.ts`（或场景文件）里的 `Intent.*` / Flow 调用；  
     - 必要的 import / Tag / Shape 引用。  
   - 优先支持：  
     - L1：生成 `Intent.andUpdateOnChanges/andUpdateOnAction`；  
     - L2：生成 `Intent.Coordinate.*`；  
     - 简单 pipeline：生成 `flow.debounce/filter/runLatest` 组合。

2. **规则表视图（IntentRule Explorer）MVP**
   - 最简 UI：  
     - 一个规则表格（每行是一条 IntentRule）+ 新建/编辑表单；  
     - 一个“生成/更新 TS 文件”的按钮。  
   - 暂时不做 Galaxy 画布，只用表格/表单验证：  
     - PM/开发在 UI 上调整规则 → 生成代码 → 在 IDE 中查看 / 调整 → 运行 PoC。

3. **与 PoC 场景集成**
   - 选 effect-poc 中 1–2 个场景，先用手写规则，再用 UI 填表单生成规则和代码；  
   - 对比两种方式体验，收集“平台侧出码”的真实反馈。

产出：  
- 一个可以运行的 “IntentRule → TS” 生成脚本/服务；  
- 一个可用的规则表 UI（哪怕是简陋的内部工具）；  
- 一套被平台出码覆盖的 PoC 场景，用于后续 Galaxy 画布的验证基础。

### Phase D：为全双工打锚（不急实现，先留钩子）

目标：不给未来的 Code→Graph 挖坑，而不是现在就实现完双向同步。

1. **约束 可解析子集 的代码风格**
   - 对 Intent API 使用定义简单约束：  
     - 一条规则对应一个 `Intent.andUpdate* / Intent.Coordinate.*` 调用；  
     - 避免在单个 Effect.gen 里把多个规则写成互相交错的 if/loop；  
     - Intent.react / Flow 组合先限制在少量可解析模式。  
   - 用 ESLint / 自定义检查脚本提示越界用法。

2. **PoC 级 Code→IntentRule 解析器**
   - 针对现有 PoC 代码，实现一个基于 ts-morph 的简单 Parser：识别 `Intent.*` 调用并还原为 IntentRule；  
   - 用于验证：  
     - 现有代码是否大部分落在可解析子集内；  
     - 哪些写法需要特别处理或打上 Gray/Black Box 标记。

3. **与 Blueprint 对齐时间**  
   - 根据 `blueprint.md` 中 v4 全双工节奏安排，将解析器/可视化调试排入后续版本，而不在 v3 强求交付。

## 3. 阶段内的决策原则

在 v3 Roadmap 执行过程中，遇到“要不要做 X / 怎么做 X”的问题时，可以先对照：

1. **是否破坏 v3 Intent 模型 / Runtime 语义？**  
   - 如有冲突，先回到 `v3/02-intent-layers.md`、`03-assets-and-schemas.md`、runtime-logix 文档修模型，再动实现。

2. **是否有助于 Logix 表达真实场景？**  
   - Phase B 优先：能让 1–2 个真实业务场景“写顺手”的改动优先级高于纯理论上的优雅。

3. **是否降低未来平台→出码 / Code→Graph 的难度？**  
   - 优先选择结构化、易解析的 API 形态，即便写起来稍微啰嗦一点。

4. **是否可以先在 PoC 验证，再沉淀为规范？**  
   - 新 API / 新 Pattern / 新 IntentRule 类型，统一先在 effect-poc 中试验，再升级到 runtime-logix / v3 规范。

本 Roadmap 本身也是“living document”：  
- 每完成一个 Phase 或经历一次较大方向调整时，应回到本文件更新目标与优先级；  
- 若 Roadmap 与 `01-overview.md` / runtime-logix / platform 规范产生冲突，以这些 SSOT 为准，并同步修订本文件。***
