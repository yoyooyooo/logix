---
title: 模式库与意图资产
status: draft
version: v1
---

> 本文深入定义「模式库（Pattern Library）」与「意图资产（Intent Asset）」，并说明它们在 toB 管理系统场景中的结构与关系。

## 1. 模式（Pattern）是什么？

### 1.1 定义

一个模式是这样一块东西：

- 来自业务开发的反复经验：某类交互/需求，在不同场景下编码思路高度相似；
- 背后有一套相对稳定的结构和最佳实践，可以在多个模块中复用；
- 可以清晰地说出“适用场景”和“反模式”，而不是模糊的“感觉差不多”。

因此，一个模式至少包含三部分：

1. **问题场景**
   - 这一类问题在业务里长什么样？
   - 有哪些典型使用场景？（例如“运营工作台”，“订单管理列表 + 详情”等）
2. **推荐结构与编码思路**
   - 推荐的 UI 结构 / 状态拆分 / 数据流 / 依赖关系。
   - 如何拆组件、如何设计 Store、如何管理副作用等。
3. **最佳实践与反模式**
   - 应该怎样写：清晰的约束和建议。
   - 不该怎样写：常见错误用法及其后果。

### 1.2 模式 vs 组件 vs 模板

- **组件**
  - 关注“元素级”复用：按钮、表单项、图表等。
  - 通常只解决 UI 层的一小块问题。
- **模板**
  - 关注“一次性生成一套骨架”：一个页面、一组文件、一段基础逻辑。
  - 强烈依赖具体技术栈与目录结构。
- **模式**
  - 关注“如何把组件、状态和数据组织成一个可复用的解决方案”。
  - 一套模式可以对应多个不同技术栈/项目中的不同模板实现。

模式位于组件之上、模板之下，是整个体系的“中枢抽象”。

## 2. 模式库（Pattern Library）

### 2.1 内容结构

对每个模式，建议用结构化文档维护（YAML 或 Markdown+Frontmatter），至少包括：

- `id`：模式唯一标识，如 `workbench-layout`、`list-detail`。
- `name`：人类可读名称，如“工作台布局”“列表 + 详情”。
- `problem`：要解决的典型问题描述。
- `applicability`：
  - 适用场景：在哪些业务/页面下适用；
  - 不适用场景：在哪些情况应该避免使用。
- `composition`：组成部分：
  - 需要哪些 UI 区块（列表、详情、工具栏、指标卡等）；
  - 需要哪些状态和数据流（过滤条件、分页状态、选中项等）。
- `dataContract`：抽象的数据约定：
  - 必须具备的实体/字段类型；
  - 接口形态（例如“支持分页 + 排序 + 筛选”的列表接口）。
- `bestPractices`：推荐用法。
- `antiPatterns`：反模式与常见坑。

在 UI 层面，模式还需要对底层组件库提出**能力约束**，而不是直接绑定某个具体组件名。可通过 `uiCapabilities` 字段表达，例如：

- 列表模式可能声明自己需要：
  - `table` 能力：支持分页、服务端筛选、列排序、列显隐等；
  - `filterControls` 能力：支持下拉选择、日期区间、关键字搜索等。
- 具体使用哪一个表格/表单组件由模板阶段和项目配置决定，模式只描述“我要什么”，不描述“用谁来做”。


为了支撑模板层与生成管线，模式在沉淀期还应补充：

- `composition.roles`：实现该模式时所需的“代码角色”列表：
  - 每个角色描述一个逻辑部件的职责边界（例如 TableComponent、FilterStore、ListQueryHook 等）；
  - 不直接绑定文件路径或具体技术栈，只说明“需要有这样一块东西”。
- `paramsSchema`：该模式在具体场景下需要向前端“询问”的参数集合（结构化 Schema）。
- `uiSchema`（可选但推荐）：如何将这些参数在平台 UI 中呈现为表单/控件：
  - 使用什么控件（select、checkbox-group、column-picker 等）；
  - 选项从何而来（例如从 Intent 的实体字段列表推导）。

这三项构成了“模式沉淀期的最低交付物”：  
在不写任何模板代码之前，团队已经就**部件拆分、参数契约和配置方式**达成共识。

角色分工（推荐）：

- 前端架构师 / 平台前端：主责创建和维护模式文档、定义角色、参数 Schema 与 UI 能力约束；
- 前端业务开发：参与补充“问题场景、适用性、反模式”等一线经验，使用模式但不直接维护模式定义；
- 产品（前端暂代）：在有条件时参与 problem/applicability 文本的校正和补充。

### 2.2 在 toB 管理系统中的典型模式

示例（非穷举）：

- `list-page`：列表页壳模式，统一“筛选区 + 工具栏 + 列表区”的页面布局（定义示例见 `patterns/list-page.pattern.yaml`）。
- `list-detail`：列表 + 详情模式。
- `workbench-layout`：左侧任务/列表 + 右侧详情 + 顶部指标卡。
- `table-with-server-filter`：分页表格 + 服务端筛选 + 批量操作（完整定义示例见 `patterns/table-with-server-filter.pattern.yaml`）。
- `wizard-form`：多步向导表单。
- `approval-flow`：审批流页面（待办+已办+详情+操作历史）。

这些模式都可以跨“订单、工单、用户、配置”等不同业务实体复用。

约定示例（信息权威）：

- 对于“筛选字段”的选择，本方案约定：
  - `filter-bar` 模式的 `fields` 参数作为权威来源；
  - 其他依赖筛选信息的模式（例如 `table-with-server-filter`）应从 `filter-bar` 配置推导，而不再单独声明一套筛选字段。
  - 这样可以避免在多个模式中重复声明同一组字段，减少意图资产中的歧义与冲突。

## 3. 意图资产（Intent Asset）

### 3.1 定义

意图资产是对“这个功能到底想要做什么”的结构化记录，至少要回答：

- 这个功能/页面的目标和成功标准是什么？
- 参与者是谁？用户在页面上做什么？
- 选用了哪些模式？每个模式作用于哪个子区域？
- 涉及哪些领域实体和接口？

它既是 AI 和工具的输入，也是人类讨论、评审和回顾的基础。

角色分工（推荐）：

- 前端业务开发：主责创建和维护具体功能的 Intent（含 L0–L3），在没有专职产品时兼任产品角色；
- 前端架构师：在关键/高风险场景下 review Intent，确保与整体架构和模式库契合；
- 产品（前端暂代）：在成熟阶段可直接参与 Intent 的 L0/L1 部分（目标与场景结构）的录入与确认。

#### 3.4 行为流（runtimeFlows，进阶）

在部分复杂场景中，除了静态的页面结构和模式选择，还需要对“按钮点击后发生什么”进行更精确、可编排的描述。  
为此，可选地在 Intent 中使用 `runtimeFlows` 字段，以声明式 DSL 的形式描述行为流水线。例如：

```yaml
runtimeFlows:
  - id: exportOrders
    trigger:
      element: toolbar.exportButton
      event: click
    pipeline:
      - call: FilterService.getCurrentFilters
        as: filters
      - call: TableUiStateService.getCurrentState
        as: tableState
      - call: ExportService.submitExportTask
        params:
          filters: "{{filters}}"
          columns: "{{tableState.visibleColumns}}"
```

要点：

- `call` 前缀部分（例如 `FilterService`、`ExportService`）对应 Pattern 中 `provides/requires` 声明的 Service ID（详见 `services.md`）；
- `as` 将调用结果写入临时上下文变量；
- 后续步骤可以通过 `{{变量名}}` 从上下文中取值；
- 当前阶段 `runtimeFlows` 主要用于表达和文档，未来可演进为生成可执行工作流（例如 Effect 程序）的数据源。

术语提示：

- **`runtimeFlows`**：Intent 中用于描述“运行时行为流水线”的字段，是行为层的声明式 DSL，专门回答“按钮点击后要依次调用哪些 Service、如何传递中间结果”。  
  结构定义与示例见本节和 `08-flow-dsl-and-ast.md`。
- **`Env`（环境）**：在 `Effect<Env, E, A>` 这类类型中，`Env` 表示“这段行为执行时可用的全部依赖集合”，
  例如 FilterService/TableUiStateService/ExportService 等服务接口的组合（出码前场景则是 FileSystem/CodeGen/Logger 等）。  
  Flow DSL 对应的 Effect 程序会通过 `Env` 注入这些服务，具体说明见 `05-effect-ts-integration.md` 与 `services.md`。

### 3.2 结构示例（toB 工作台场景）

示例 YAML（简化版）：

```yaml
id: ops-workbench
title: 运营工作台
description: 统一处理运营任务的桌面工作台

goals:
  - 提升任务处理效率 30%
  - 支持 1440px 桌面 + 窄屏折叠

scene:
  type: workbench
  actors:
    - role: operator
      description: 日常处理任务的运营人员
  flows:
    - from: "待处理列表"
      to: "详情面板"
      action: "开始处理任务"
    - from: "详情面板"
      to: "待处理列表"
      action: "完成任务后返回"

patterns:
  - id: workbench-layout
    config:
      leftPanel: tasks-list
      rightPanel: task-detail
  - id: table-with-server-filter
    target: tasks-list
    config:
      pagination: true
      batchActions: [assign, complete]

domain:
  entities:
    - name: Task
      fields:
        - id: string
        - status: enum[TODO, DOING, DONE]
        - assignee: string
        - priority: enum[LOW, MEDIUM, HIGH]
  apis:
    - name: listTasks
      path: /api/tasks
      method: GET
      returns: Paginated<Task>
    - name: getTaskDetail
      path: /api/tasks/{id}
      method: GET
      returns: Task

openQuestions:
  - "任务优先级是否影响排序规则？"
  - "列表是否需要实时刷新？"

autoFill:
  - "根据 Task 字段自动生成列表列配置初稿"
```

要点：

- `patterns` 显式引用模式库中的模式 ID，并对每个模式给出配置。
- `domain` 只描述必要的实体和接口，避免深度侵入业务实现细节。
- `openQuestions` 和 `autoFill` 显示“空白”与“可由 AI 补全”的位置。

### 3.3 约束与最佳实践

- 意图资产应对人类可读，不只是机器用的配置。
- 重大结构变更（例如模式替换、实体重构）应先落在意图资产，再通过生成工具推到代码。
- 意图资产应纳入版本控制，并与代码版本建立关联（例如在提交信息中引用意图 ID）。

## 4. 模式与意图的关系

### 4.1 从意图到模式

- 意图资产中 L1/L3 信息（场景结构 + 领域数据）构成模式选择的基础。
- 工具或 AI 可以根据这些信息：
  - 推荐适用模式（如场景包含“列表+详情”，则推荐 `list-detail`）；
  - 提示不适用模式（例如“数据流不支持分页，暂不能使用分页表格模式”）。

### 4.2 从模式到意图

- 模式定义中可以声明：要应用该模式，需要意图中具备哪些字段/结构。
- 工具可以根据模式 schema 自动生成意图草稿片段：
  - 例如插入一段标准的 `flows` 或 `domain.entities` 模板，提示开发者补全。

### 4.3 一致性与演进

- 当模式演进（增加约束或变体）时：
  - 不应直接在代码里“悄悄改实现”，而是先更新模式文档；
  - 再根据模式更新意图资产，再生成或 refactor 代码。
- 当发现多个意图在“绕着同一类问题打补丁”时：
  - 说明需要上升一个新模式，或扩展已有模式；
  - 模式库是长期沉淀业务经验的地方，而不是单个项目的私有知识。

## 附录 A：与 best-practice 仓库的对齐（可选）

本节仅说明当前团队在 best-practice 仓库中的推荐落地方式，帮助阅读者把抽象的 Pattern 角色与具体代码文件对上号。它属于实现层实践，不是 Pattern 定义本身的硬约束。

参考文档：

- 文件类型与命名规范：`/Users/yoyo/projj/git.imile.com/ux/best-practice/docs/02-principles-and-architecture/05-file-conventions.md`
- 状态管理标准（Zustand / TanStack Query）：`/Users/yoyo/projj/git.imile.com/ux/best-practice/docs/02-principles-and-architecture/06-state-management.md`
- 组件设计规范：`/Users/yoyo/projj/git.imile.com/ux/best-practice/docs/02-principles-and-architecture/07-component-design.md`
- 接口集成开发指南：`/Users/yoyo/projj/git.imile.com/ux/best-practice/docs/03-development-guides/03-api-integration-guide.md`
- 适配器模式指引：`/Users/yoyo/projj/git.imile.com/ux/best-practice/docs/03-development-guides/11-adapter-pattern-guide.md`

### A.1 典型角色到文件类型的映射示例

以 `table-with-server-filter` 等列表类模式为例，常见角色与 best-practice 文件类型之间的推荐对应关系为：

- `FilterStore` / `TableStore`（筛选状态、表格 UI 状态）
  - 推荐落地为：
    - 聚合 Store：`*.store.ts`（如 `features/order/stores/order.store.ts`）
    - 领域 slice：`*.slice.ts`（如 `features/order/stores/slices/filter.slice.ts`）
  - 依据：`*.store.ts` / `*.slice.ts` 作为 Zustand 状态与行为的基本粒子。

- `ListQueryHook`（列表查询 Hook）
  - 推荐落地为：
    - TanStack Query Hook：`*.hook.tsx`，位于 `features/[domain]/queries/` 目录，例如 `features/order/queries/use-order-list.hook.tsx`。
  - 依据：best-practice 要求服务端缓存统一由 TanStack Query 承担。

- `ExportService`（导出服务）
  - 推荐落地为：
    - 原始 HTTP 通信：`*.service.ts`，如 `features/order/services/order.service.ts`；
    - 数据结构转换：`*.adapter.ts`，如 `features/order/adapters/order.adapter.ts`。
  - 依据：服务层只管 IO，结构转换集中在 adapter，避免污染领域模型。

- `ColumnsConfig`（列配置与静态 UI 配置）
  - 推荐落地为：
    - 组件静态配置：`*.config.tsx`，如 `features/order/components/order-table.config.tsx`。
  - 依据：大体量的表格列配置与表单字段配置集中在 `.config.tsx`，方便复用与测试。

这些映射的原则是：

- Pattern 只定义“需要哪些角色 / 能力”；
- 具体落到哪种文件类型、目录与命名方式，由当前的实现规范来约束（目前主要参考 best-practice 仓库）；
- 当实现规范演进时，可以在不改变 Pattern 定义的前提下，更新这类“角色 → 文件类型”的对齐规则。
