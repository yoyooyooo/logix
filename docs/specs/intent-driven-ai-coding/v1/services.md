---
title: 标准服务接口约定（Services）
status: draft
version: v1
---

> 本文列出在 Pattern / Template / Intent (runtimeFlows) 中会出现的标准 Service ID，  
> 这些 ID 对应未来 TS 层的 Service 接口或 Effect Tag，用于统一依赖关系和行为编排。

## 1. 列表相关服务

- **FilterService**
  - 来源：
    - 由 `filter-bar` 模式中的 `FilterStore` 角色提供。
    - `table-with-server-filter` 的 `ListQueryHook` 依赖。
  - 职责：
    - 维护当前筛选条件（status/date 等）；
    - 提供读取当前筛选状态的能力（`getCurrentFilters`）。

- **TableUiStateService**
  - 来源：
    - 由 `table-with-server-filter` 模式中的 `TableStore` 角色提供。
  - 职责：
    - 维护表格 UI 状态（页码、每页条数、排序、列显隐等）；
    - 提供读取当前表格 UI 状态的能力（`getCurrentState`）。

- **ListQueryService**
  - 来源：
    - 由 `table-with-server-filter` 模式中的 `ListQueryHook` 角色提供。
  - 职责：
    - 基于 FilterService 与 TableUiStateService 提供的状态，发起列表请求；
    - 为表格渲染提供数据源（items/total/loading/error 等）。

- **PageShellService**
  - 来源：
    - 由 `list-page` 模式中的 `PageComponent` 角色提供。
  - 职责：
    - 提供统一的列表页壳（filters/toolbar/table 布局与样式容器）。

## 2. 导出与快速编辑相关服务

- **ExportService**
  - 来源：
    - 由 `table-with-server-filter` 模式中的 `ExportService` 角色提供（可选）。
  - 职责：
    - 将当前筛选条件和表格状态转换为导出请求载荷；
    - 提交导出任务。

- **QuickEditService**
  - 来源：
    - 由 `toolbar-with-quick-edit` 模式中的 `QuickEditComponent` 角色提供（可选）。
  - 职责：
    - 提供打开/关闭快速编辑界面、提交快速编辑变更的能力；
    - 通常依赖实体的更新接口（如 updateOrder）。

## 3. 通用服务（示意）

- **NotificationService**
  - 未来用于在 Flow DSL 中展示成功/失败通知：
    - `NotificationService.show({ type, message })`。

这些 Service ID 在 Pattern 的 `provides/requires`、Template Meta 的实现标签，以及 Intent 的 `runtimeFlows.pipeline.call` 中会多次出现。  
统一命名和职责划分，可以为 Effect/DI 框架提供清晰的接口契约。 

示例参考：

- 运行时 Service 接口与简单内存实现示例（含极简 Flow 执行器）：
  - `/Users/yoyo/projj/git.imile.com/ux/imd/docs/specs/intent-driven-ai-coding/v1/poc/model/runtime-services.example.ts`

## 4. Service 与 Effect 程序的关系（示例）

在出码前平台内核中，我们推荐将行为逻辑建模为 Effect 程序（可采用 effect-ts 或 v1/poc/effect.ts 中的简化类型），
并让 Service 方法以 Effect 形式暴露。示意接口（省略具体 Env/E 类型）：

```ts
// 示例：FilterService 在 Effect 语境下的形态
interface FilterService<Filters> {
  getCurrentFilters: Effect<Env, never, Filters>
  setFilters: (patch: Partial<Filters>) => Effect<Env, never, void>
  resetFilters: Effect<Env, never, void>
}

interface TableUiStateService {
  getCurrentState: Effect<Env, never, TableUiState>
}

interface ExportService<Filters> {
  submitExportTask(args: { filters: Filters; columns: string[] }): Effect<
    Env,
    ExportError,
    void
  >
}
```

在 Flow DSL 中写下的：

```yaml
- call: FilterService.getCurrentFilters
  as: filters
```

在解释执行时会被转换为类似：

```ts
const flowEffect: Effect<Env, never, void> = pipe(
  FilterService.getCurrentFilters,
  Effect.bindTo('filters'),
  // ...
)
```

注意：

- 对普通 CRUD 场景，业务代码可以继续使用简单的 async/await + Hook；  
- 一旦某个行为被提升到 Intent.runtimeFlows，并希望由平台和 LLM 长期维护与重构，推荐在平台内核中为其生成/维护 Effect 版本。
