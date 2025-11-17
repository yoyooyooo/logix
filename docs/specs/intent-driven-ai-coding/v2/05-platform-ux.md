---
title: 平台界面与交互蓝图
status: draft
version: 2
---

> 本文从 UX 角度描述平台长什么样：
> - 不再是“一个大表单 + 几个 YAML 预览”；
> - 而是围绕六类意图，为不同角色提供多视图的 IDE：Intent Studio / Pattern Studio / Code Studio / Flow Studio。

> 说明：本文件聚焦 v2/MVP 及其直接演进形态，更远期的画布高级交互、用例透视、自动重构等能力，统一收敛在 `99-long-term-blueprint.md`，避免与当前实现目标混淆。

## 0. 角色与职责（产品 / 架构 / 前端）

为了简化，平台主要服务三类角色：

- **产品（或前端兼任）**：
  - 站在业务视角表达 Layout / View / Interaction / Data 这四层意图；
  - 在 Intent Studio 中进行“线稿级”表达，或提供自然语言/线框素材交给 LLM 生成草稿；
  - 负责审核 LLM 生成的 Layout/View/Data 草图与约束提示，而不是逐字段填表。
- **架构**：
  - 在 Pattern/Flow/Code Studio 中塑造 View/Behavior/Data/Code Structure 的模板与规范；
  - 负责模式库、模板库、Flow DSL 与运行时（Effect）设计，并维护 LLM Prompt/任务 API；
  - 保障意图层与工程层之间的映射稳定可演进。
- **前端开发**：
  - 拉取由 Intent+Pattern+Plan 生成的代码骨架，在本地 IDE 中补充实现细节；
  - 当需求变化时回到 Intent Studio/Pattern Studio/Flow Studio 更新意图，再增量出码；
  - 逐渐转为审核/确认角色：在 CLI/LSP 中查看 LLM 生成的 diff、约束告警，再决定是否应用，而不是在 Intent 层直接“写 DSL”。

## 1. 顶层导航（路由层）

- `/` Dashboard：最近 Intent/Plan Runs/Flow 状态概览；
- `/intents`：Intent 资产库；
- `/intents/new`：Intent Studio · 线稿模式；
- `/intents/:id`：Intent Studio · 维度视图（Layout/View/Interaction/Behavior/Data/Code Structure）；
- `/patterns`：模式库列表；
- `/patterns/new`、`/patterns/:id/edit`：Pattern Studio；
- `/patterns/:id/registry`：模式发布与引用视图；
- `/flows`：行为 Flow 列表与 Flow Studio；
- `/assets`：模板、服务、Prompt 等资产中心。

### 1.1 预览为主体的工作台布局

无论处于哪个路由，核心工作台布局保持一致：

- 顶部：全局导航（Dashboard / Intents / Patterns / Flows / Assets）。
- 左侧：当前锚点的 Outline（Intent 列表或 Use Case 列表）。
- 中间：**实时预览区域**（Preview Pane），渲染当前 Intent 的页面/组件，以真实运行时栈运行（React + Query + Store + Flow）。
- 右侧：意图面板（Intent Pane），根据当前 Tab 切换不同意图层的编辑视图（Layout/View/Interaction/Behavior/Data/Code）。

所有配置与编排都围绕预览展开：

- 用户通过选中预览中的元素（Button、Drawer、Select 等），在右侧面板编辑其 Layout/View/Interaction/Data 意图；
- 修改意图后，预览即时反映结构变化（重新挂载组件骨架和行为 Flow），让产品/前端用“搭界面”的方式表达意图，而不是先去找某个表单。

## 2. Intent Studio · 按意图层分屏与线稿模式

在 `/intents/:id` 下，主工作区拆成六个视图（Tab 或左侧导航）：

1. **Layout 视图（界面分区线稿）**  
   - 线稿模式：
     - 中间是一块有限尺寸的网格（例如 4×4 或 6×4）；
     - 产品/前端拖动划出逻辑区域（filters/toolbar/table/metrics 等），输入简短 label；
     - 右侧实时显示 `LayoutIntent` JSON 预览与区域树（vertical/horizontal 树结构）。
   - 细节模式：
     - 使用列表/树编辑 Region 的 id/label/role，微调布局类型（list-page/workbench/...）；
     - LLM 可基于需求文本或粗略网格“一键生成布局草图”，用户再微调。

2. **View 视图（组件与模式）**  
   - 左侧：
     - 按 Layout slot 展示列表（filters/toolbar/table/metrics/...）；
     - 每条显示当前已绑定的模式（如 filter-bar、table-with-server-filter）。
   - 中间：Pattern 卡片墙：
     - 每张卡片说明模式用途、支撑的意图层（layout/view/behavior/data）；
     - 支持搜索、筛选（如“支持导出”“支持分页”）。
   - 右侧：属性面板：
     - 使用 Pattern.uiSchema 渲染紧凑表单（列配置、按钮集合等）；
     - 视图层参数变更会同步到 `view.components[].propsIntent`。

3. **Interaction 视图（事件与 UI 效果）**  
   - 主视图是事件表格：
     - 列：元素（source）、事件类型（event）、UI 效果（uiEffect.type/target）、补充说明；
     - 支持从页面预览中“录制”交互（点击元素后自动填 source）。
   - 可选小画布：
     - 节点为 UI 元素/状态，连线表示“点击 A → 打开 B”；
     - 用于复杂交互关系的总览，而不是精细配置。

4. **Behavior & Flow 视图（业务流程线稿 + Effect）**  
   - Flow 列表：显示每个 Flow 的 id、触发源、服务覆盖范围；
   - Flow 详情：
     - 左侧为“步骤列表”，支持用自然语言编辑每一步（例如“调用 ExportService 提交任务”）；
     - 中间为 Flow DSL/AST 视图（结构化 JSON 或 DSL 文本）；
     - 右侧为 `.flow.ts` 预览（Effect 程序骨架），只读或受控编辑。
   - 交互：
     - 产品/前端可以只维护自然语言步骤，架构/LLM 负责生成/润色 Flow DSL + Effect；
     - 支持在此视图内运行沙箱执行，查看日志与错误。

5. **Data & State 视图（实体 / 接口 / 状态来源）**  
   - 实体表：
     - 行：字段名/类型/是否必填/枚举值/描述；
   - API 表：
     - 列出 list/update/export 等接口的 path/method/参数；
   - 状态来源：
     - 指定某个实体对应的 stateSource（react-query/zustand/local）。
   - 交互：
     - 支持从 OpenAPI/JSON schema 导入结构；
     - LLM 根据已有视图/Flow 意图补全缺失字段与接口。

6. **Code Structure 视图（模块骨架）**  
   - 模块/文件树视图：
     - 以 feature 为根展示目录树（page/components/store/service/query/flows 等）；
     - 每个节点标记 kind（page/component/...）、对应 Template/Pattern；
   - Plan 草稿区：
     - 右侧显示 create-file 列表，允许 FE/架构调整某些路径/模板绑定；
   - 交互：
     - FE 可以用“线稿”方式新增/删减模块（例如加一个分离的 FilterStore）；
     - LLM 根据 CodeStructureIntent + best-practice 规范，生成/调整 Plan。

所有视图共享右侧的：

- Copilot 条：显示当前意图层的“线稿完成度”与下一步建议；
- Diff/历史：可以对比本次编辑与上一次生成的 Intent/Plan/Flow。

## 3. Pattern Studio v2 · 避免表单爆炸

在 `/patterns/:id/edit` 中：

- 顶部 Tabs：
  - 基础信息（id/name/summary/status/intentLayers）；
  - Roles/Params（composition.roles + paramsSchema）；
  - UI & Runtime（uiSchema + runtimeBindings）；
  - 引用与约束（哪些意图/Plan 使用了它、质量约束）。
- 每一块使用紧凑表格/折叠面板：
  - 角色列表用 DataGrid（每行是一个角色，点击展开详情）；
  - 参数 schema 是 key/type/required/desc 表；
  - UI Schema 是字段→widget→label→options 的列表；
  - Runtime bindings 是 slot→component import→service 的列表。
- LLM 辅助：
  - 从自然语言描述/现有代码生成初版 Pattern；
  - 根据引用情况建议拆分/合并模式。

## 4. Flow Studio v2 · 行为层的“白板”

在 `/flows` 和 `/flows/:id`：

- 列表视图：所有 Flow（BehaviorIntent.flows）的索引：
  - 显示所属 Intent/Pattern/Service，状态（草稿/发布）、最近运行情况。
- 详情视图：
  - 左侧：Flow 步骤列表；
  - 中间：简化画布（节点：Service/条件节点；连线：数据流与控制流）；
  - 右侧：Flow DSL 编辑区 + `.flow.ts` 预览。
- 运行时联动：
  - 可在沙箱中执行 Flow 查看日志；
  - 结合 Effect-ts 中间件，展示重试/超时/审计的行为。

## 5. Code Studio v2 · 出码骨架

在 `/code-structure` 或 Intent Studio 的 Code Structure 视图：

- 模块骨架编辑器：
  - 以树/表格形式编辑 CodeStructureIntent.files；
  - 提供 feature 模板快速创建一组文件（page+components+store+service+flows）。
- Plan 视图：
  - 将 CodeStructureIntent + TemplateSpec 映射到 PlanSpec；
  - 提供 “DRY run” 控制台预览即将生成的文件树。
- 与 best-practice：
  - 显示每个文件关联的 best-practice guideline；
  - LLM 可根据 guideline 提醒不符合规范的设计。

## 6. Intent Sketch Canvas 何时出现？

画布不是 v2 的前提，而是一种可能的“线稿交互形态”：

- 在 Layout 层，可选用网格线稿表达区域；
- 在 Interaction & Flow 层，可用小画布表达事件与流程；
- 在 Code Structure 层，仅用简单 dependency graph 表示模块关系。

关键是：

- 每个画布节点都必须对应某一类意图（Layout/View/Interaction/Flow/Data/Code Structure），
- 画布只用在“流程/关系”表达更自然的地方，而不是把所有信息挤在一张图上。

## 7. 意图表达阶段：自由度与上限

为了保证“自由度和上限”，Intent Studio 在各层意图上都提供三种输入方式：

- 自然语言线稿：
  - 用户可以直接写段落描述布局/交互/流程/模块拆分；
  - LLM 将其解析为 Layout/View/Interaction/Behavior/Data/CodeStructure 各自的草稿。
- 结构化控件：
  - 网格线稿、Pattern 选择器、事件列表、字段表、模块树等低门槛 UI；
  - 用户可以用这些控件“修剪”LLM 的草稿或从零构建线稿。
- 直接编辑 Schema：
  - 高级用户可以切换到 JSON/TS Schema 编辑视图，精准修改 IntentSpec/PatternSpec 等；
  - 平台保证结构完整性，并可视化 diff 与影响范围。

线稿阶段的设计原则：

- **不强制一次性填满所有层**：用户可以先只表达 Layout + View，之后再补 Interaction/Behavior/Data/CodeStructure；
- **所有层都可以增量编辑**：每次修改都形成一个 IntentSpec 版本，并可回滚；
- **LLM 只在用户明确触发时润色**：避免“黑盒重写”，所有变更都可见、可 diff。

## 8. 简化版角色流水线（产品 / 架构 / 前端）

以“订单管理列表”为例：

- **产品（或前端兼任）**：
  1. 在 Intent Studio 的 Layout/View/Data 视图中，通过自然语言+控件画出线稿（区域、组件、字段）。
  2. 在 Interaction/Behavior 视图中，用简单句子描述关键事件和期望行为（导出、快速编辑）。
  3. 提交/共享 Intent 草稿给架构。

- **架构**：
  1. 在 Pattern Studio 中挑选/完善适用模式（list-page/layout/table/filter 等），补 Roles/Params/UI/Runtime 绑定；
  2. 在 Flow Studio 中用 Flow DSL 或可视化步骤完善 Behavior & Flow，并生成/审阅 `.flow.ts`；
  3. 在 Code Studio 中根据团队规范调整模块骨架（特定目录与模板使用），生成或修订 Plan。

- **前端**：
  1. 使用 Code Studio/CLI 拉取 Plan 生成的代码骨架；
  2. 在本地实现视觉/交互细节、边界处理，并对平台上不完整的意图进行反向补充；
  3. 在后续迭代中，通过 Intent Studio/Pattern Studio/Flow Studio 修改意图，再增量出码。

整个过程中，意图表达阶段既支持自由线稿（自然语言 + 画布 + 控件），又提供精细 Schema 编辑（满足上限），而下面的 Pattern/Plan/Flow/Effect 只是在不同层次上把这些意图“落地”为可执行的代码与运行时行为。
