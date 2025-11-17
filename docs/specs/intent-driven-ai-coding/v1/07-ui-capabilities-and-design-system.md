---
title: UI 能力与设计系统约定（uiCapabilities & runtimeBindings）
status: draft
version: v1
---

> 本文是对「意图 → 模式 → 模板」体系中 UI 层约束的补充，回答两个问题：  
> 1）模式声明的 `uiCapabilities` 到底是什么；  
> 2）它们如何与具体设计系统 / 组件库通过 `runtimeBindings` 对上号，并保持可演进。

## 1. 为什么要引入 uiCapabilities？

如果模式直接写死“要用某个组件（例如 ProTable）”，会带来几个问题：

- 模式无法在不同项目/技术栈间复用（强绑具体组件库）。
- 模式文档会变成某个库的使用手册，而不是抽象的编码套路。
- 后续替换组件库时，需要重写所有模式和模板，成本极高。

我们希望：

- 模式只说“我需要一个**具备某些能力的表格/筛选控件**”，不关心具体组件名；
- 不同项目可以用自己的组件库去满足这些能力；
- 模式和意图不用因为组件库迁移而重写，只需要调整绑定关系。

这就是 `uiCapabilities` 的作用：  
**在模式层抽象 UI 能力，在模板层绑定具体组件实现。**

## 2. uiCapabilities 的基本形态

### 2.1 能力命名规则

建议使用「领域 + 能力」的命名方式，并在模式中集中声明，例如：

```yaml
uiCapabilities:
  table:
    required:
      - pagination          # 支持分页
      - serverSideFilter    # 支持服务端筛选
      - sortableColumns     # 支持列排序
    optional:
      - rowSelection        # 行选择能力
      - columnVisibility    # 列显隐

  filterControls:
    required:
      - select
      - dateRangePicker
    optional:
      - keywordSearch
```

命名建议：

- 第一层 key 表示“能力域”（例如 `table` / `filterControls` / `layout`）。
- 第二层为该能力域下的能力标识（`pagination` / `serverSideFilter` 等），使用 kebab-case 或 camelCase，保持短小清晰。

### 2.2 能力语义约定

每个能力标识（如 `pagination`）需要在文档中给出语义定义，例如：

- `pagination`：表格组件需要支持 `page`、`pageSize`、`total` 三个参数，并暴露 `onPageChange`、`onPageSizeChange` 回调。
- `serverSideFilter`：表格组件不负责本地过滤，而是将 filter 参数透传给调用方，以便调用方发起新的请求。
- `sortableColumns`：允许为每一列单独开启排序，并通过回调告知当前排序字段与方向。

这些定义应写入模式文档或一个集中约定文件中，作为组件库适配和模板实现的依据。

## 3. runtimeBindings：能力到组件的映射

在 Template Meta 中，通过 `runtimeBindings` 把 uiCapabilities 映射到具体组件实现。例如：

```yaml
runtimeBindings:
  uiCapabilities:
    table:
      useComponent: ProTable
      import: "@/components/ProTable"
    filterControls:
      useComponents:
        select:
          import: "@/components/Select"
        dateRange:
          import: "@/components/DateRangePicker"
        keyword:
          import: "@/components/KeywordInput"
```

含义：

- 对于模式声明的 `table` 能力域：
  - 当前项目用 `ProTable` 组件来承载；
  - 模板生成代码时会统一从 `"@/components/ProTable"` 引入。
- 对于 `filterControls` 能力域：
  - `select/dateRange/keyword` 分别映射到对应组件；
  - 模板生成表单控件时，根据这些绑定渲染正确的 JSX。

注意：

- 一个项目可以有多套 Template Meta（例如用于不同 UI 库）；
- 只要 `runtimeBindings` 满足模式声明的能力要求，模式和 Intent 不需要修改。

## 4. 对模板和代码生成的影响

### 4.1 模板内部如何使用 uiCapabilities？

以列表查询 Hook + 表格组件为例，模板在渲染代码时可以这样使用绑定：

```ts
function renderTableComponent(args: {
  bindings: RuntimeBindings
  params: { entity: string; columns: ColumnSpec[] }
}) {
  const { bindings, params } = args
  const tableComponentImport = bindings.uiCapabilities.table.import
  const tableComponentName = bindings.uiCapabilities.table.useComponent

  return `
import { ${tableComponentName} } from '${tableComponentImport}'

export function ${params.entity}Table() {
  // ...
  return (
    <${tableComponentName}
      columns={columns}
      data={data}
      page={page}
      pageSize={pageSize}
      total={total}
      onPageChange={setPage}
      onPageSizeChange={setPageSize}
    />
  )
}
`
}
```

模板不需要关心“是 ProTable 还是别的表格”，只用绑定信息做字符串插值即可。

### 4.2 能力不满足时的行为

当某个模板需要用到某项能力（例如 `rowSelection`），但当前 Template Meta 中的绑定没有声明该能力时：

- 生成器应拒绝执行或给出明确警告；
- 可以提示“当前模板依赖 table.rowSelection 能力，但项目绑定中未声明，请由架构师在 Template Meta 中补齐绑定或者关闭该能力”。

这避免了“生成的代码在 UI 上缺某些关键行为”的隐性问题。

## 5. 对阅读者的入门路径提示

对于第一次接触这套规划文档的人，推荐的阅读顺序是：

1. `01-overview.md`：理解意图 / 模式 / 模板三层抽象和 L0–L4 分层。
2. `02-patterns-and-intents.md`：理解模式文档和意图资产的结构。
3. `07-ui-capabilities-and-design-system.md`（本文件）：理解模式与底层组件库是如何通过能力+绑定解耦的。
4. `04-platform-design.md`：理解平台侧的交付物（Intent/Pattern/Template Meta/Plan/Log）和角色分工。
5. `06-platform-ui-and-interactions.md`：用 ASCII 草图具体感受平台 UI 工作流。
6. `v1/patterns/*.pattern.yaml`、`v1/intents/*.intent.yaml`、`v1/templates/*.template.yaml`、`v1/plans/*.plan.json`：通过订单管理 CRUD 示例把概念对上真实文件。

这样，即使从 0 接触该体系，也可以先从抽象层逐步走到“组件库绑定”和“实际代码生成”的细节。

## 6. 角色视角下的 UI 能力与绑定维护

- 前端业务开发：
  - 不直接维护 `uiCapabilities` 和 `runtimeBindings`；
  - 只需要知道：模式在当前项目里会用哪些基础组件（通过文档或平台 UI 显示）；
  - 重点在于选对模式、填好参数、审阅 Plan。
- 前端架构师 / 平台前端：
  - 定义和维护 `uiCapabilities` 含义（能力命名与语义）；
  - 在 Template Meta 中维护 `runtimeBindings`，确保与项目设计系统/组件库吻合；
  - 在组件库升级或替换时，负责调整绑定，而不破坏模式与 Intent。
- 产品（前端暂代）：
  - 更多关心模式带来的“交互一致性”与“可用性”，不直接参与能力/绑定配置。

通过这层抽象，模式与意图可以专注表达“场景与套路”，  
Template Meta 和组件库则负责“具体怎么画出来”，两者解耦但有清晰接口。 

## 7. 与 IMD / best-practice 的关系（说明）

在当前团队环境中：

- UI 组件与设计系统主要来自 IMD 仓库：`/Users/yoyo/projj/git.imile.com/ux/imd`（例如 `apps/www2/registry/default/ui/` 下的组件）；
- 与 UI 互动的状态管理、服务层与适配器等实现实践则主要来自 best-practice 仓库：`/Users/yoyo/projj/git.imile.com/ux/best-practice`。

在本规划中：

- `uiCapabilities` 只在模式层描述“需要什么能力”（表格、筛选控件、布局等），不直接绑定某个具体 UI 库或组件实现；
- 具体在 IMD 中由哪些组件承载这些能力、在 best-practice 中使用哪些状态/服务/适配器模式来驱动这些组件，属于实现层细节，可以通过单独的约定或文档（例如 IMD 内部的 registry 规范、best-practice 内的 file-conventions 与 state-management 指南）进行协调；
- 当组件库或实现实践需要演进时，优先调整的是“能力与组件/代码之间的绑定”，而不是修改 `uiCapabilities` 的概念本身。
