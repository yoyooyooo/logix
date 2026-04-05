# 5. 与 ESLint / 工具链的协作

为了保持“代码可解析”，平台和 runtime 建议提供 ESLint 规则或 CLI 检查：

- 禁止在可解析子集范围内使用复杂表达式：
  - 例如 forbidding：`source.pipe(doSomethingDynamic())` 作为 IntentRule 源；
  - 引导开发者把复杂逻辑放入 Pattern / Service，而不是塞进 Flow pipeline 中。

- 提供自动修复建议：
- 将“展开写法”重构为标准 Fluent 链（e.g. 识别 `fromState + debounce + run(state.mutate)`，自动建议替换为 `$.onState(...).debounce(...).mutate(...)`）。

这可以保证随着代码库增长，越来越多的 Logic 写法落在“可解析、可 round‑trip”的子集内。
