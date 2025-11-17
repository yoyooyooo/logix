---
title: 平台侧界面与交互设计（ASCII 草图）
status: draft
version: v1
---

> 本文只讨论「意图 / 模式 / 出码计划」平台的前端界面与交互，不涉及具体实现技术栈。  
> 目标是让前端业务开发和前端架构师都能直观想象：平台长什么样、每一步怎么用。

## 1. 整体信息架构

平台可以被视为三个主要工作区 + 若干辅助视图：

```text
+-------------------------------------------------------------+
| Top Bar: [Logo] [Intent Studio] [Pattern Studio] [Plans]    |
+-------------------------------+-----------------------------+
| Left Sidebar                  | Main Panel                  |
| - 场景列表 / 模式列表 / Plan | - 当前工作区具体内容       |
|   历史                       |                             |
+-------------------------------+-----------------------------+
```

- **Intent Studio**：按场景管理意图（Intent），主要给前端业务开发用。
- **Pattern Studio**：管理模式（Pattern），主要给前端架构师用。
- **Plans / Generation Console**：查看/审阅/执行出码计划（Plan）。

以下章节分别展开。

## 2. Intent Studio（意图工作台）

### 2.1 布局草图

```text
+-------------------------------------------------------------+
| Top Bar: [Intent Studio]* [Pattern Studio] [Plans]          |
+----------------------+--------------------------------------+
| Intent List          | Intent Editor                       |
|                      |                                      |
| [新建场景]           | +-------------------------------+   |
|                      | | Tabs: [概览] [场景结构] ...  |   |
| - order-management   | +-------------------------------+   |
| - ops-workbench      | |  表单区域（Goals/Scene/...） |   |
| - user-list          | |                               |   |
|                      | |  [ 使用向导 / Ask AI 补全 ]   |   |
|                      | +-------------------------------+   |
|                      | | YAML 预览（只读/高级编辑）   |   |
|                      | +-------------------------------+   |
+----------------------+--------------------------------------+
```

- 左侧：场景列表 + “新建场景”按钮。
- 右侧：当前场景的编辑区域，采用“分步表单 + YAML 预览”的形式。

### 2.2 关键交互流程

**流程 A：新建场景 / 意图**

1. 点击左上角 `[新建场景]`：
   - 弹出对话框：输入场景名称、ID（例如 `订单管理列表 / order-management`）。
2. 创建后，右侧进入“意图向导”：
   - Step 1：目标（goals）与简介；
   - Step 2：场景结构（页面类型、布局区域）；
   - Step 3：实体与接口（Domain）；
   - Step 4：主要流程（Flows）。
3. 每一步都有“用 AI 继续补全”按钮，AI 会：
   - 从已有描述推测缺失字段；
   - 给出建议（例如“是否需要导出能力？”）。
4. 点击“保存”后，平台：
   - 校验 Schema；
   - 写入 `intents/<id>.intent.yaml`；
   - 将当前状态标记为：`ready-for-pattern`。

**流程 B：模式推荐入口**

在 Intent Editor 的“场景结构”/“概览”页，底部提供：

```text
[ 推荐模式 ]  [ 手动选择模式 ]  [ 查看已绑定模式 ]
```

- 点击“推荐模式”：
  - 调用后端 `/patterns/match`，传入当前 Intent 摘要；
  - 右侧弹出“模式候选侧栏”，展示推荐模式卡片；
  - 每张卡片有：名称、摘要、适用场景、风险提示、[详情] 链接。
- 前端业务开发可直接**勾选**需要的模式：
  - 被勾选的模式会写入 Intent 的 `patterns` 字段；
  - 若模式有必填参数，平台自动导航至“模式配置表单”（见下一节）。

### 2.3 模式配置表单（从 Intent 侧进入）

当一个模式被选中后，Intent Editor 中会出现“模式配置”页签：

```text
Tabs: [概览] [场景结构] [领域模型] [模式配置] [YAML 预览]

[ 模式配置 ]

模式：table-with-server-filter
目标区域：table

字段：       控件：
------------------------------------------
实体:        [ Order v ]                  (select，选自 intent.domain.entities)
分页:        [ 开关 on/off ]              (switch)
批量操作:    [x] 导出 [ ] 批量更新        (checkbox-group)
列配置:      [ 列选择器组件 ]             (column-picker)
筛选字段:    [ status, createdAt ]       (multi-select)
------------------------------------------
           [ 保存配置 ]   [ 用 AI 推荐 ]
```

- UI 的字段来源于 Pattern 的 `paramsSchema` 与 `uiSchema`。
- “用 AI 推荐”：
  - 例如自动推荐列集合（常用字段）；
  - 自动推荐筛选字段（有枚举/时间语义的字段）。
- 保存后：
  - 更新 Intent 中对应模式的 `patterns[].config`；
  - 标记意图为 `ready-for-plan`。

## 3. Pattern Studio（模式库管理）

### 3.1 布局草图

```text
+-------------------------------------------------------------+
| Top Bar: [Intent Studio] [Pattern Studio]* [Plans]          |
+----------------------+--------------------------------------+
| Pattern List         | Pattern Detail / Editor              |
|                      |                                      |
| [新建模式]           | +-------------------------------+   |
|                      | | table-with-server-filter    v |   |
| - list-detail        | +-------------------------------+   |
| - workbench-layout   | | Summary / Problem /           |   |
| - table-with-server… | | Applicability / Roles         |   |
| - wizard-form        | +-------------------------------+   |
|                      | | Params Schema / UI Schema     |   |
|                      | | [ YAML 视图 ] [ 示例引用 ]    |   |
|                      | +-------------------------------+   |
+----------------------+--------------------------------------+
```

- 左侧：模式列表 + 新建模式。
- 右侧：模式详情与编辑，包括：
  - 基础信息；
  - `composition.roles`；
  - `paramsSchema`/`uiSchema`；
  - 示例 Intent/Plan 关联。

### 3.2 关键交互流程

**流程 C：新建/编辑模式**

1. 架构师点击 `[新建模式]`：
   - 填写：`id/name/summary`；
   - 在“问题与适用性”标签页录入 problem / applicability。
2. 在“组成与角色”标签页：
   - 添加 roles（如 TableComponent、FilterStore 等）；
   - 对每个角色写职责说明。
3. 在“参数与 UI”标签页：

```text
[ 参数定义 ]
- entity: string (required)
- pagination: boolean (default: true)
- batchActions: string[] (enum: export, bulkUpdate)
...

[ UI Schema 预览 ]
entity        -> select       (options: intent.domain.entities)
batchActions  -> checkbox-group (options: export/bulkUpdate)
columns       -> column-picker  (options: entity.fields)
```

4. 在“UI 能力约束与组件绑定”标签页（架构师视图）：

```text
[ UI 能力约束 ]

table:
  required: [ pagination, serverSideFilter, sortableColumns ]
  optional: [ rowSelection, columnVisibility ]

filterControls:
  required: [ select, dateRangePicker ]
  optional: [ keywordSearch ]

[ 组件绑定（当前项目） ]

table:
  useComponent: ProTable
  import:      "@/components/ProTable"

filterControls.select:
  useComponent: Select
  import:      "@/components/Select"

filterControls.dateRangePicker:
  useComponent: DateRangePicker
  import:      "@/components/DateRangePicker"
```

这一页的配置会写入 Template Meta 中的 `runtimeBindings`，决定“模式需要的 UI 能力在当前项目里由哪些组件来实现”。前端业务开发通常只关心模式与参数，组件绑定由前端架构师维护。

4. 保存时，平台：
   - 验证 `paramsSchema` 结构正确；
   - 写入 `patterns/<id>.pattern.yaml`。

**流程 D：从 Intent 跳回模式**

在 Intent Studio 中，点击某个模式卡片上的 `[详情]` 或 `[在模式库中打开]`：

- 跳转到 Pattern Studio，并定位到对应模式；
- 右侧直接展示该模式的 Problem/Applicability/Roles/Params；
- 支持从这里导航回“使用了该模式的 Intent 列表”，方便架构师看“谁依赖了这个模式”。

## 4. Generation Console（出码计划 / Plans）

### 4.1 布局草图

```text
+-------------------------------------------------------------+
| Top Bar: [Intent Studio] [Pattern Studio] [Plans]*          |
+----------------------+--------------------------------------+
| Plan List            | Plan Detail / Preview                |
|                      |                                      |
| [按 Intent 筛选]     | Intent: order-management            |
|                      | 状态: 未执行 / 已执行               |
| - order-management   | Version: v1                         |
|   (2024-xx-xx)       |                                      |
| - ops-workbench      | +-------------------------------+   |
|   (2024-xx-yy)       | | 文件树 / Action 列表          |   |
|                      | +-------------------------------+   |
|                      | | 右侧：Diff / Params 详情      |   |
|                      | +-------------------------------+   |
|                      | [ 执行计划 ]  [ 仅生成部分 ]    |
+----------------------+--------------------------------------+
```

### 4.2 Action 列表交互（以 CRUD 示例为例）

Action 列表可以用“文件树 + 勾选框”的形式呈现：

```text
[x] src/features/order-management/order-management.page.tsx         (list-page-shell)
[x] src/features/order-management/components/order-filters.tsx     (filter-bar)
[x] src/features/order-management/components/order-table.tsx       (table-with-server-filter)
[x] src/features/order-management/components/order-toolbar.tsx     (toolbar-with-quick-edit)
[x] src/features/order-management/components/order-quick-edit.tsx  (quick-edit-dialog)
[x] src/features/order-management/stores/filter.slice.ts           (filter-store-slice)
[x] src/features/order-management/stores/table.slice.ts            (table-store-slice)
[x] src/features/order-management/queries/use-orders-list.hook.ts  (list-query-hook)
```

- 点击某一行：
  - 右侧展示该 action 的详情：

```text
Action: create-file
Path:   src/features/order-management/queries/use-orders-list.hook.ts
Pattern:  table-with-server-filter
Template: list-query-hook

Params:
- entity:  Order
- apiName: listOrders

[ 展开 Intent 区域 / 展开 Pattern 定义 / 展开 Template Meta ]
```

- 前端业务开发可以：
  - 取消勾选某些 action（例如暂不生成 quick-edit 相关文件）；
  - 调整部分 params（如果允许），例如覆盖默认 pageSize；
  - 通过右侧链接快速查看相关 Intent/Pattern/Template 定义。

### 4.3 执行与日志查看

执行流程：

1. 业务前端审阅无误后点击 `[ 执行计划 ]`：
   - 平台调用 `/plans/execute?intentId=...`；
   - 即时展示进度条和每个 action 的执行状态（成功/失败/跳过）。
2. 执行结束后：
   - 提供链接打开执行日志视图：

```text
执行结果: 成功 (8/8)

步骤:
1. create-file src/features/order-management/order-management.page.tsx ... OK
2. create-file src/features/order-management/components/order-filters.tsx ... OK
...

[ 查看日志 JSON ] [ 在 Git 中对比 diff ]
```

LLM 可在此视图中提供：

- 针对失败 action 的解释（参数缺失、模式约束不满足等）；
- 针对整个 Plan 的高层总结（例如“本次生成新增 8 个文件，均为新建，无破坏性修改”）。

## 5. 角色在界面中的具体操作范围汇总

### 5.1 前端业务开发

- 在 Intent Studio：
  - 新建/编辑 Intent（包括目标、场景结构、实体与接口等）；
  - 触发模式推荐，选择和配置模式；
  - 查看 YAML 预览，确认结构化结果。
- 在 Generation Console：
  - 查看与当前 Intent 相关的 Plans；
  - 审阅 action 列表和 Params 详情；
  - 决定哪些 action 执行，哪些跳过；
  - 触发 Plan 执行，查看执行日志。

### 5.2 前端架构师 / 平台前端

- 在 Pattern Studio：
  - 创建/编辑模式定义（含 roles、paramsSchema、uiSchema）；
  - 查看哪些 Intent 引用了某个模式；
  - 评估/指导模式演进对下游的影响。
- 在 Template 管理界面（可在 Pattern Studio 或 Plans 侧栏中）：
  - 定义 Template Meta，绑定模式角色与文件路径模式；
  - 维护模板与技术栈/目录结构的关系；
  - 配合生成器设计 Plan 中 action 的粒度。

### 5.3 AI 代理（在 UI 层可以看到的能力入口）

UI 中建议提供显式的 AI 入口，例如：

- Intent Studio：
  - “用 AI 补全本节”；
  - “用 AI 从 PRD 摘要生成初版 Intent”。
- Pattern Studio：
  - “用 AI 帮我从现有代码提取候选模式文档”；
  - “用 AI 生成 paramsSchema 初稿（由架构师 review）”。
- Generation Console：
  - “用 AI 解释当前 Plan 的影响”；
  - “用 AI 给出执行前/后的风险提示或回滚建议”。

LLM 只通过这些明确的入口参与，不直接对文件写入做最终决策，从而保证平台的可控性和可审计性。
