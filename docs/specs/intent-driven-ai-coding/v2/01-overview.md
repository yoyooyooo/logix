---
title: intent-driven · 意图分层与平台蓝图
status: draft
version: 2
---

## 0. 与上一版的区别（概要）

- 视角从“资产类型”（Intent/Pattern/Plan）转为“意图类型”（布局/视图/交互/行为/数据/工程结构）；
- 将原先混在一个 Intent/Pattern/Plan 里的多层意图拆开，分别建 Schema 和文档；
- 明确 Effect/Flow/Template/Runs 在各意图层的角色，使“从意图到出码”的链路可追踪、可调试；
- 平台交互不再是单页大表单，而是按意图层拆成多个视图（Intent Studio / Pattern Studio / Flow Studio / Code Studio）。

## 1. 设计目标

- 允许开发者**自由表达线稿级意图**：像画速写一样描述界面、交互和代码结构，而不是一上来就填写细碎表单。
- 把前端开发拆成一组**互斥又互补的意图类型**，每类意图都有专门的 schema、文档与 UI 视图。
- 平台与 LLM 的职责清晰：
  - 用户画“线稿”（Intent Sketch）；
  - 平台+LLM 负责“润色”（生成 Pattern 绑定、Flow、Plan、代码骨架）。
- 所有资产（Intent/Pattern/Template/Plan/Flow）只是不同意图类型的**载体**，而不是一堆混合概念。

## 2. 前端六大意图类型

我们将前端开发里的意图拆成六类（约束/质量单独附着在其上）：

1. **布局意图 Layout Intent**  
   - 回答“页面如何分区、各区域相对位置和占比”。
   - 示例：工作台三栏布局、列表页上中下结构等。

2. **视图 / 组件意图 View & Component Intent**  
   - 回答“每个区域里放什么 UI 模式/组件，它们的变体是什么”。
   - 示例：列表+筛选、wizard 表单、审批时间轴等。

3. **交互意图 Interaction Intent**  
   - 回答“用户操作 → 立即的 UI 反馈”。  
   - 示例：点击按钮打开弹框、切 Tab、高亮选中行、滚动定位。

4. **行为 / 流程意图 Behavior & Flow Intent**  
   - 回答“跨组件/跨步骤的业务流程是什么，要调用哪些服务”。  
   - 示例：导出订单 = 取当前筛选 + 可见列 → 调 ExportService → 成功后提示并记录任务。

5. **数据 / 状态意图 Data & State Intent**  
   - 回答“数据长什么样、校验规则是什么、状态存在哪里”。  
   - 示例：订单实体字段与枚举、表单字段 schema、筛选条件放在本地 store 还是 URL。

6. **工程结构意图 Code Structure Intent**  
   - 回答“代码如何组织、模块和文件怎么拆”。  
   - 示例：订单模块拆成 page/components/store/service/queries，使用哪套模板/目录规范。

> 此外还有一类横切的 **约束 / 质量意图 Constraint & Quality Intent**（性能、安全、兼容性、可观测性等），会附着在上面六类意图的不同载体之上。

## 3. 资产与意图类型的映射（v2 总表）

| 意图类型 | 主要承载资产 | 说明 |
| --- | --- | --- |
| Layout | Intent.scene.layout / layout Pattern | 描述区域分区与布局树，不含具体组件与行为细节 |
| View & Component | UI/Pro Pattern（composition/uiSchema）、Intent.view 段 | 描述区域内的 UI 模式与组件结构 |
| Interaction | Intent.interaction 段 / Flow DSL trigger / 组件实现 | 事件 → UI 反馈（打开/关闭/切换等） |
| Behavior & Flow | Intent.behavior.flows / Flow DSL / `.flow.ts` | 业务步骤链、服务调用、分支与错误处理 |
| Data & State | Intent.domain / pattern.dataContract / store & query 规范 | 实体、表单/校验、状态来源与生命周期 |
| Code Structure | Plan / Template / best-practice 目录约定 | 模块、文件、切片与模板映射 |
| Constraint & Quality | Pattern/Intent/Plan 的 metadata | 性能 budget、a11y、安全与“Never break userspace”约束 |

这个体系要做的不是发明新的资产，而是：

- 明确每种资产**承载哪些意图类型**，哪些不该放；
- 为每种意图提供独立的 schema 与交互视图；
- 让 LLM 在“意图层”工作，而不是直接在混合 YAML 上硬猜。

## 4. 后续章节

- `02-intent-layers.md`：逐一定义六类意图（含 Schema 草稿与示例）。
- `03-assets-and-schemas.md`：映射 Intent/Pattern/Template/Plan/Flow 到各意图层，给出 Schema 草图。
- `04-intent-to-code-example.md`：用订单管理示例串起“从意图到出码”的完整链路。
- `05-platform-ux.md`：平台 UI/UX 蓝图，描述不同角色如何在各意图层工作。
- `design/*`：分别深入布局/视图/交互/行为/数据/工程结构/约束等维度。
- `SCHEMA_EVOLUTION.md`：记录 schema 演进合同与兼容性规则。

后续所有实现都应以本分层模型为参照：先问“用户正在表达哪一类意图”，再决定“它要落在哪个资产和视图里”，最后才考虑用什么技术实现（表单/画布/树/代码）。

## 5. 落地策略：先造“引擎”，后造“座舱”

> v2 的野心是合理的，但真正影响可用性的，是 Intent→Plan→代码的稳定链路。本版起，所有落地工作沿“引擎优先”推进：先定事实源与合同，再实现幂等出码，最后才进入 Studio/画布阶段。

### 5.1 核心约束（立即纳入 Schema 与实现）

- **事实源分级**：
  - Data & State：若已有 OpenAPI/TS Schema，Intent 只能引用 `ref`；暂时允许 `source: "local"` 的临时定义，后续用迁移工具统一；
  - Interaction：事件 `source/event` 只能在 InteractionIntent 中定义，Flow 只允许引用 `eventId`；
  - Code Structure：Plan/Template 必须落在现有 best-practice 目录之内，由路径校验器给出 warning/错误。
- **ID 生命周期**：六类意图及 Use Case 均采用统一 ID 规范；禁止裸字符串引用，引用由 `id-utils` 生成与迁移。
- **Schema 合同**：Intent/Pattern/Template/Plan/Flow 的 schema 变更遵守 `SCHEMA_EVOLUTION.md`，新增字段必须可选，破坏性修改必须附带迁移器。
- **Plan 幂等语义**：`create-file` 不得覆盖用户代码、`modify-file`/`append-snippet` 必须基于锚点/AST；CLI 执行前写入 dry-run diff，执行后可重复运行且结果一致。

### 5.2 MVP 里程碑（引擎 → 试点 → UX）

1. **M0 · 文档收敛**：更新所有 v2 文档以反映上述约束，并新增 `SCHEMA_EVOLUTION.md` 记录演进规则。
2. **M1 · 类型与校验**：实现 IntentSpecV2/PlanSpecV2 的 TS 类型、校验器与 ID 工具；CLI 支持 `imd intent check/apply`，但暂不生成复杂 UI。
3. **M2 · 幂等出码引擎**：完成 React 组件与 `.flow.ts` 的 AST merge，Plan 执行具备幂等与冲突提示；代码结构校验器默认 warn，可配置为 hard fail。
4. **M3 · 仓库端到端试点**：在 IMD 主仓库挑选真实 feature，编写完整 Intent/Plan/Flow，跑通“首次出码 → 人工补全 → 调整 Intent → 增量出码”闭环，形成问题清单反哺 schema 与工具。
5. **M4+ · Studio 与预览**：在引擎稳定后，再循序上线 Intent Viewer、Pattern/Flow Studio、画布联动等 UX，避免第二系统效应。

所有子团队在提出新需求前，应先审视其对上述里程碑的影响：能否先以文件/CLI/LSP 形态验证，再投入 Studio 实现。

### 5.3 LLM 演进协作原则

> 预设 LLM 能力持续提升：平台需把“人类输入”逐渐转成“约束与审核”，让模型负责更多润色，但严守输出合同。

- **轻输入，硬输出**：Intent/Plan/Flow 支持更粗粒度的自然语言或半结构描述，由 LLM 生成/重排草稿；输出仍需通过 schema 校验、幂等 Plan、AST merge，模型换代也不会破坏代码。
- **模型接口可插拔**：定义稳定的任务 API（如 `generate_view_intent`、`refine_flow_steps`），Prompt/模型版本独立管理，可灰度升级或回滚，而不影响 CLI/Studio 工作流。
- **自动提炼事实源**：允许上传现有 OpenAPI/TS 文件/代码片段，由 LLM 提炼出 Data & State 投影或 Interaction 事件；减少人力维护重复信息。
- **强校验与对比**：每次 LLM 输出都要自动进行 schema 校验、约束消费检查、Plan dry-run diff，并与上版结果对比，把差异和潜在破坏点展示给人类审核。
- **反馈循环**：记录生成命中率、回退率与冲突率，形成模型评估指标；失败样本进入训练池，为下一代模型或 Prompt 微调提供素材。
