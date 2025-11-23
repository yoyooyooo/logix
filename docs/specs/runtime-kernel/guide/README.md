# Logix 用户手册 · 导航

> 面向「使用 Logix 写业务」的一线工程师与平台集成方，帮助你在不深挖全部设计文档的情况下，用几个典型工作流把 Logix 用起来。

## 文档结构

- `01-overview-and-roles.md`  
  从使用者视角解释 Logix 在整个架构中的位置、适用场景，以及和 Effect Flow Runtime、React/表单库的关系。

- `02-getting-started-basic-form.md`  
  以「注册表单」为例，走通从 Schema → `makeStore` → Logic → React 组件接入的完整流程，对应 `core/examples/01-basic-form.md`。

- `03-getting-started-list-and-query.md`  
  以「列表 + 筛选 + 分页」为例，介绍数据加载与刷新逻辑，对应 `core/examples/02-complex-list.md` 和部分 `integration-guide.md`。

- `04-common-patterns-and-scenarios.md`  
  汇总 `core/scenarios/*.md` 里的典型场景（字段联动、异步校验、数组联动、生命周期、WebSocket 等），用「配方」方式给出推荐写法。

- `05-working-with-effect-flow-runtime.md`  
  说明如何在 Logix 中触发服务侧 Flow（Effect Flow Runtime），以及如何回填状态、展示执行结果，对应 `v2/97-effect-runtime-and-flow-execution.md` 的 Runtime 家族说明。

> 说明：设计/实现细节仍以 `core/` 下文档为准；本手册只聚焦「怎么用」「在什么场景下用」。
