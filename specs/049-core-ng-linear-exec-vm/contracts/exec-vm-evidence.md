# Contract: Exec VM Evidence（可解释字段口径）

本 contract 定义 Exec VM 的“可解释证据字段”口径（不要求实现细节）。

## Required

- diagnostics=off：不得引入额外分配；允许仅输出 `KernelImplementationRef`（045）与最小开关摘要。
- diagnostics=light/sampled/full：必须能解释：
  - 是否命中 Exec VM（hit）
  - 未命中原因码（`reasonCode`，稳定枚举码；可选 `reasonDetail` 补充）
  - 关键摘要（例如 plan/cache/预算结果的最小字段）
- 字段必须 Slim、可序列化、可裁剪；禁止把闭包/大型对象图塞进事件。
