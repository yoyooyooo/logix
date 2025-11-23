# 04 · 常用配方：从 scenarios 到日常写法

> 对应：`core/scenarios/*.md`  
> 目标：把场景文档里的「能力测试用例」翻译成日常可以直接复用的写法模板。

## 1. 字段联动与重置

**场景**：选中某个字段时，重置一批相关字段（如国家变化时重置省份/城市）。  
**参考**：`core/scenarios/01-core-scenarios.md` · Scenario 1.1。

推荐模式：

- 使用 `watch('country', handler)` 监听单个字段；  
- 在 handler 中使用 `set` 批量更新，必要时配合 `Effect.all` 或 `batch`。

适用场景：

- 简单联动，更新数量不大；  
- 不需要跨多个模块或外部源。

## 2. 异步校验与错误状态

**场景**：字段变化触发异步校验（用户名重名检查、优惠码校验等），结果写回 `errors.xxx`。  
**参考**：`core/scenarios/02-core-scenarios.md` 中的校验场景，以及 `core/examples/01-basic-form.md`。

推荐模式：

- 使用 `watch('field', handler, { debounce, concurrency })`；  
- 在 handler 中通过 `services.SomeApi` 调用后端；  
- 用 Effect 的 `retry` 处理瞬时错误；  
- 把校验结果收敛到错误字段（而不是在组件里做逻辑判断）。

适用场景：

- 大部分表单字段级异步校验；  
- 希望在 Kernel 层统一控制防抖/并发策略。

## 3. 多字段约束（如开始/结束时间）

**场景**：多个字段之间存在约束（开始时间必须早于结束时间，总金额必须等于明细之和等）。  
**参考**：`core/scenarios/01-core-scenarios.md` · 多字段联动段落。

推荐模式：

- 使用 `watchMany(['startDate', 'endDate'], handler)`；  
- 在 handler 中根据多个值设置统一的错误字段或状态字段。

适用场景：

- 逻辑只依赖有限几个字段；  
- 错误提示/派生状态集中在一个或少量字段上。

## 4. 数组联动（列表行内计算）

**场景**：商品列表中，行内字段变化时需要计算每行/整体的合计。  
**参考**：`core/scenarios/01-core-scenarios.md` · Scenario 3.1。

推荐模式（v1 标准写法）：

- 优先监听整个数组 `watch('items', handler)`，在 handler 中全量重算；  
- 在 `set('items', newItems)` 时依赖 Kernel 内部的 Deep Equal + Loop Protection 避免死循环。

适用场景：

- 列表长度在可接受范围内（通常 <1000）；  
- 对性能要求中等，希望以更简单的写法换取可维护性。

## 5. 初始化加载（Init Load）

**场景**：Store 创建时自动加载一次数据（详情页、首屏列表等）。  
**参考**：`core/scenarios/01-core-scenarios.md` · Scenario 4.1。

推荐模式：

- 使用 `watch('someKey', handler, { immediate: true })`；  
- 或在 `logic` 初始化阶段显式添加一个“Init 规则”（视最终 API 为准）。

适用场景：

- 页面或模块渲染后立即拉取数据；  
- 数据加载行为与某个状态字段（如 `id`）相关联。

## 6. 外部源集成（WebSocket / 轮询）

**场景**：订阅 WebSocket 消息、轮询任务状态等。  
**参考**：`core/scenarios/01-core-scenarios.md` · Scenario 5.1，`core/integration-guide.md`。

推荐模式：

- 在 Store 配置中通过 `inputs` / `mount` / `onInput` 注入外部 Stream；  
- 在 Logic 中编写「外部事件 → 状态更新」的规则（例如价格更新、任务进度更新）。

适用场景：

- 实时行情、任务进度条、通知中心等；  
- 希望把外部源整合进同一套 Kernel 状态与调试视图。

> 更多细节和高级场景（动态逻辑、Intent 优先级、复杂流编排）可以继续参考 `core/scenarios/02-advanced-scenarios.md` 与 `core/examples/*`，本章只覆盖日常开发中最常遇到的几类“配方”。

