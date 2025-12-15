---
title: Trait-First Form Patterns (v3 Draft)
status: draft
version: 0.1.0
value: pattern
priority: later
related:
  - ./10-scenarios-and-gaps.md
  - ../../../../specs/007-unify-trait-system/contracts/form.md
  - ../../../../specs/007-unify-trait-system/contracts/trait-lifecycle.md
---

# Trait-First Form Patterns（基于 Trait 的表单模式草案）

> **定位**：本篇只讨论“用 Trait 原装能力支撑复杂表单场景”的总体思路，不引入新 Helper API，也不绑定某个具体表单框架。  
> **目标**：为未来的表单高级语法糖（如 DynamicList、Reactive.computed/effect 风格 Helper）提供“地板约束”：  
> 所有语法糖都应当**展开为 Trait + 普通 Logic**，而不是在 Runtime 侧引入第二套状态/订阅/事务语义。

## 1. 范围与前提

- 面向场景：
  - 复杂表单（含动态列表 Form Array、联动校验、异步上传/校验、多步提交）；
  - 日常“管理后台 / 业务表单”在规模化后常见的模式，而非一次性的 Demo。
- 基础约束（以 `specs/007-unify-trait-system` 为裁决）：
  - **Trait 三阶段**：蓝图 → setup → run：
    - 蓝图：由 Trait 声明/DSL 构建 StateTraitProgram / Graph / Plan；
    - setup：只做 Env 无关的结构接线（source 刷新入口、Debug/Devtools 锚点）；
    - run：在 StateTransaction 内执行派生逻辑与副作用；
  - **事务语义**：一次逻辑入口 = 一次 StateTransaction 提交：
    - 对外只见一次状态写入 + 一次订阅通知；
    - Devtools 以 txnId 聚合 Trait 步骤与 Patch；
  - **订阅语义**：状态订阅只在事务 commit 时触发，不为“中间状态”再开第二套订阅；
  - **Env/Dev-only**：所有环境判断统一通过 `@logix/core/env` 暴露的 `getNodeEnv` / `isDevEnv`，表单语法糖不得在运行时私自依赖 `process.env` 或隐式 dev-only 状态。

在此前提下，本文评估：**Trait 原装 API 是否足够支撑表单场景**，以及未来表单 Helper 在设计时需要遵守哪些约束，才能与当前 Trait/事务/Devtools 规划自然对齐。

## 2. Trait 原装能力在表单场景的覆盖面

### 2.1 计算字段（Computed）

典型需求：

- `fullName = firstName + lastName`；
- `durationYears = diff(startDate, endDate)`；
- 表单顶部的统计：`totalAmount`、`hasPendingItems` 等。

用 Trait 的承接方式：

- 使用 Trait 的 computed 能力：
  - `target`: 目标字段（如 `fullName`/`durationYears`/`stats.totalAmount`）；
  - `deps`: 一组 selector（如 `[firstName, lastName]`、`[startDate, endDate]`、`orderLines[*].amount`）；
  - `derive`: 纯函数，对 deps 做同步计算。
- 在事务模型下：
  - 同一次输入/操作导致的所有 computed 更新都在**同一个 StateTransaction** 内发生；
  - 对外只有一次 commit，不会暴露 computed 中间过程。

结论：  
对于“值级计算 / 汇总字段”，Trait 原装 computed 能力是足够的，不需要额外为表单定义新抽象。未来的 `Reactive.computed` Helper 可以被视为“语法糖层”，展开后仍然是 Trait 蓝图 + run 段逻辑。

### 2.2 字段联动与元信息（Link & Meta）

典型需求：

- A 字段控制 B 字段的可见性/可编辑状态；
- 操作单个字段时自动更新多个相关字段；
- 维护 per-field / per-item 的 `dirty` / `touched` / `visited` 等 meta 信息；
- 表单级 error/状态汇总（例如“存在未保存更改”）。

用 Trait 的承接方式：

- 使用 Trait 的 link 能力：
  - 监听一个或多个字段的变更；
  - 在 run 阶段以“imperative update”的方式写 meta / 其他字段；
  - 仍然在固定的 StateTransaction 上下文内执行。
- meta/校验状态本身只是**普通状态字段**：
  - 如 `educationList[i].meta.{dirty,touched}`、`formErrors`；
  - Trait 负责维护其值，不需要额外的“validation 引擎”。

在事务 + Devtools 视角下：

- 某次输入引出的所有联动写入（包括 meta 变化）都聚合在同一个事务里；  
- Devtools 事务视图可以直接看到“这次输入触发了哪些 meta/错误字段的变化”。

结论：  
字段联动与 meta 维护完全可以视为 Trait 的 link 用例，不要求 Runtime 特殊对待“校验”或“表单状态”。未来表单 Helper 只需在蓝图层声明这类约束，run 时展开为 Trait 即可。

### 2.3 动态列表（Form Array）与 per-item 逻辑

典型需求：

- `educationList[]` 这类 Form Array；
- 支持增删行、批量操作某一列；
- 每行有自己的 computed/link/source（例如 duration / per-item errors / per-item upload 状态）；
- 行与行之间存在联动约束（如“当前在读只能有一条”）。

用 Trait 的承接方式：

- 状态层：
  - 列表与行数据都是普通 state 字段（`educationList: Array<...>`）；
  - 针对列表项的 meta/errors/status 一律按字段建模：
    - `educationList[i].errors`、`educationList[i].meta`、`educationList[i].upload`.
- Trait 蓝图层可以有两种策略：
  1. **显式展开**：  
     通过 Schema 或 Logic 在蓝图阶段，根据“列表字段 + 模板 Trait 集合”生成具体的 Trait 节点集合（如 `trait: education[i].duration`），图结构中每个节点都沿用统一模板；
  2. **参数化节点（实现细节）**：  
     在 Graph/Plan 内部允许某种“pattern per item”的表示方式，但对 Runtime/Devtools 暴露时仍然是具体 path + traitNodeId 的集合。

核心约束：

- TraitGraph 只关心“路径 + 节点 + 依赖”，对“是否来自数组模板”是透明的；
- **Trait 蓝图必须在 build 阶段生成**，不允许在 run 阶段按用户增删行动态注入新的 Graph 结构（否则破坏 Phase Guard 与 Devtools 稳定性）。

结论：  
动态列表场景并不要求重新设计 Trait 模型，只要求未来的 DynamicList / for-each 类 Helper 在实现时遵守“蓝图一次性展开”的约束，将 per-item 行为展开为可见的 Trait 节点集合。

### 2.4 异步操作与资源字段（Source）

典型需求：

- per-item 上传、重试、进度展示；
- 字段的远程校验（如唯一性校验）；
- typeahead / 远程搜索；
- 多步提交（草稿、本地缓存、最终提交）。

用 Trait 的承接方式：

- Source 类 Trait：
  - 监听 trigger（如 `uploadTrigger`/`validateTrigger`）；
  - 在 StateTransaction 内启动 Effect，与外部服务交互；
  - 根据结果写回本地状态字段（如 `status`、`errors`、`options`）。
- 与 Resource Field 草案的关系：
  - `03-unified-resource-field.md` 描述的 ResourceField，更像 Schema 侧的“源头描述”；
  - 实际运行时仍然需要经由 Trait/Logic 编译为 Effect + 状态写入；
  - 表单场景只是 ResourceField 的一个高频用例（upload / validation / lookup）。

在事务 + Devtools 视角下：

- 一次“点击上传”可以拆成：
  - origin.kind = "action" 的事务：将状态设为 uploading；
  - origin.kind = "service-callback" 的事务：写回上传结果；
  - Devtools 中的时间线以 origin + txnId 组织，Trait/source 步骤只是对应事务里的事件。

结论：  
异步表单逻辑可以统一归入「Source Field + Trait.source + 普通 services」范畴，不需要 Runtime 为表单单独扩展契约。需要的是在 ResourceField/Query Integration 的落地时，刻意把“表单型 Resource”视为一等场景来验证。

## 3. 表单语法糖对未来 Helper 设计的约束

> 目标：未来任何 form helper（DynamicList, FormState, ReactiveForm 等）都应当是“Trait-aware 的语法糖”，而不是 Runtime/Devtools 的平行世界。

### 3.1 必须蓝图优先（Blueprint-First）

- Helper 负责：
  - 在 Schema / Logic 层生成 TraitProgram / Graph / Plan 蓝图；
  - 在 setup 阶段将蓝图正确接线（source 刷新入口、Debug 锚点等）。
- Helper 不得：
  - 在 run 阶段按用户交互动态修改 Graph 结构；
  - 避开 Trait 路径直接在 ModuleRuntime 内部维护另一套状态机。

### 3.2 必须遵守事务边界

- Helper 在内部必须以 StateTransaction 为“原子执行单元”：
  - 一次表单操作（输入/点击/提交） = 一次 StateTransaction；
  - Helper 不可绕开事务直接多次 setState，让 Devtools 无法重建“这次交互”的完整轨迹。
- 如果 Helper 需要细粒度阶段（如“验证阶段”“提交阶段”），应通过：
  - 拆分为多次逻辑入口（多事务），并在 origin 中标注阶段；
  - 或在单次事务内用 Trait/Flow 的步骤区分，但 commit 仍只有一次。

### 3.3 不得引入第二套状态订阅通道

- Helper 不得提供“绕过 ModuleRuntime.changes(selector)”的私有订阅通道；  
  特别是：
  - 不得引入“中间状态订阅 API”作为官方推荐路径；
  - 诊断/观测诉求一律通过 RuntimeDebugEvent + Devtools 解决。
- 如确有需要的“中间状态观察”，应实现为：
  - dev-only 的 Debug 事件；
  - 或 Devtools 内部在快照 + Patch 上的虚拟重建（不更改 Runtime 状态）。

### 3.4 Devtools 视图与 Helper 的关系

- Devtools 的核心视图保持不变：
  - Module → Instance → Transaction → Event；
  - TraitGraph + 生命周期视图。
- Helper 可以为 Devtools 提供更友好的 annotation：
  - 在 Trait 蓝图 meta 中写入“属于哪个 form helper / 哪个字段模板”；
  - 在 Debug/RuntimeDebugEvent meta 中标注“来源于某个 form helper 的哪个步骤”。
- 但 Devtools 不应为某个特定 Helper 特化整体模型：
  - 即使后续出现 “Form Helper 面板”，也应视为在 TraitGraph/事务时间线上的第二视图，而不是另一套数据结构。

## 4. 对当前 Trait/事务规范的影响评估

结合上文分析，本草案对现有 `003-trait-txn-lifecycle` 特性与 Trait 核心规范的结论是：

1. **不需要在当前 Trait/事务规范中增加表单专用条款**：  
   - Trait 的 computed/link/source + StateTransaction 模型已经足以覆盖日常表单场景与复杂 Form Array；  
   - 事务/订阅/Devtools 模型的抽象层级高于表单，不会因为表单用例而需要收缩或变形。

2. **表单语法糖设计必须将当前规范视为“不可破坏的底座”**：  
   - Helper 的职责是简化蓝图声明与 Logic 写法，而不是绕开 Trait/事务/Debug；  
   - 一旦 Helper 发现某些模式难以用现有 Trait/事务抽象表达，应优先反馈到 Trait/Runtime 规范层（例如新增 Trait 能力），而不是在 Helper 内部私自扩展运行时契约。

3. **未来工作建议（非本轮范围）**：
   - 在 runtime-logix SSoT 中补充一小节“基于 Trait 的表单推荐模式”，以高级原则的形式归纳本篇要点；  
   - 在 `topics/trait-system/21-dynamic-list-and-linkage.md` 基础上，未来可增加「DynamicList / FormState Helper 设计」草案，将当前 Trait/事务规范映射成具体 Helper API；  
   - 在 Devtools 与 Sandbox 场景中，以一个高 Trait 密度的表单模块作为长期回归样本，用于验证事务/时间旅行/渲染事件视图的稳定性与可用性。

本篇仅作为「Trait-First Form 模式」的前置草案，后续若实际实现 form helper / form DSL，可在此基础上细化 API 形状与约束，并视成熟度将部分内容上升到 runtime-logix 的正式规范中。
