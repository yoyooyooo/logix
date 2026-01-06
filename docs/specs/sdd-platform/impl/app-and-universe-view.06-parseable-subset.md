# 6. 约束与可解析子集

为了让上述实现保持可控，平台需要对 ModuleDef 写法做一些约束：

- **对象字面量优先**：
  - `Logix.Module.make('Id', { ... })` 推荐使用直接的对象字面量；
  - 避免在配置中使用 `...spread`、条件表达式、运行时变量拼接等复杂写法。
- **符号引用优先**：
  - `imports` / `providers` / `links` / `processes` / `exports` 数组中的元素应为简单标识符或 `Logix.provide(Tag, Value)` 这种固定模式；
  - 避免在数组中写复杂表达式（如立即调用函数等）。

对于不满足上述约束的写法，平台可以：

- 将对应模块标记为“部分可解析”或 Gray Box；
- 仅在 Universe View 中展示有限信息，避免给出误导性的拓扑。
