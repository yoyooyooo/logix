# 03 · 列表 + 筛选 + 分页（List & Query）

> 场景：一个典型的「查询列表页」，包含搜索条件、分页、加载状态与刷新按钮。  
> 对应核心示例：`core/examples/02-complex-list.md`，以及部分 `core/integration-guide.md`。

## 1. 场景复述（用户语言）

- 用户可以输入多个筛选条件（关键字、状态、时间范围等），点击「查询」后加载列表；  
- 切换页码或每页条数时自动重新拉取数据；  
- 显示加载中状态与空/错误态，并支持手动刷新。  

本指南只关注「如何用 Kernel 与其 Adapter 写出这类页面」，不讨论具体 UI 组件实现。

## 2. 步骤一：设计 State Schema

先在 Kernel 中为列表页定义状态结构（详见 `core/examples/02-complex-list.md` 的 Schema 段落）：

- `filters`：查询条件对象（关键字、状态等）；  
- `pagination`：页码、每页条数、总数；  
- `list`：当前页数据；  
- `meta`：`isLoading`、`error` 等运行状态。  

推荐做法：

- 把所有能被 URL/后端理解的条件都放在 Schema 中，避免隐式「局部状态」；  
- 区分「输入条件」（如未提交的筛选表单）与「实际生效条件」（当前请求使用的 filters），必要时用两个字段承载。

## 3. 步骤二：设计 Logic 规则

在 `logic` 中使用 `watch` / `watchMany` / `onAction` 将状态变化转为数据加载行为：

- 当 `filters` 或 `pagination.page` 变化时，触发一次请求；  
- 将请求过程包裹在 Effect 中，更新 `meta.isLoading`、写入 `list` 和 `pagination.total`；  
- 对应的伪代码与完整规则示例可参考 `core/examples/02-complex-list.md`。

实践要点：

- 把「筛选变化 -> 重置页码 -> 触发加载」拆成两个规则：一个只改页码，一个负责加载；  
- 请求逻辑放在 Kernel Logic 中，通过注入的 `services.Api` 调用后端，避免在 React 组件内写 `useEffect`。  

## 4. 步骤三：在 React 中接入

在 React Adapter 层，借助 `useStore` / `useSelector` 将列表页状态绑定到组件：

- 使用 `useSelector` 只订阅当前组件真正关心的切片（例如列表数据、分页信息、加载状态）；  
- 通过派发 Action 或调用 `set` 来修改 `filters`、`pagination` 并驱动逻辑规则。  

表单式的筛选区域可以结合 `@kernel/form` 的 `useForm` / `useField`（见 `../form/03-react-api.md`），把「筛选表单」本身也纳入 Kernel 状态机。

## 5. 进一步阅读

- `core/examples/02-complex-list.md`：完整的 Schema、Store 与 Logic 示例；  
- `core/scenarios/01-core-scenarios.md`：与列表相关的核心场景（筛选联动、重置、初始化加载）；  
- `core/integration-guide.md`：如何与 React Query、WebSocket 等第三方数据源协作；  
- `../react/01-hooks-api.md`：关于 `useSelector` 的细粒度订阅与性能注意事项。
