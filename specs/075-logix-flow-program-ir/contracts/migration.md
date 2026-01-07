# Migration Notes（forward-only）

本特性新增 FlowProgram API，用于把“手写 watcher 工作流”升级为“可编译控制律”。

## 建议迁移

- 把关键工作流（submit/跳转/刷新/重试）逐步迁到 FlowProgram：
  - 使时间算子进入 tick 参考系（避免影子 setTimeout/Promise 链导致 replay/解释断链）
  - 使结构 IR 可导出（便于 Devtools/审查/diff）

## 不提供兼容层

- forward-only：不会保留“旧 API 的 shim”或弃用期；迁移以类型检查与新文档为准。

