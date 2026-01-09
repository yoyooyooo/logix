# Contracts: Public API（Source Auto-Trigger）

## 1) `@logixjs/core`：`StateTrait.source` policy

目标：把 `Π_source` 的受限自由度从“反射式 meta（triggers/debounceMs）”升级为明确契约，并可导出 IR。

建议：

- 移除 / 废弃：
  - `triggers: ['onMount'|'onKeyChange'|'manual']`
  - `debounceMs`
- 替换为：
  - `autoRefresh?: { onMount?: boolean; onDepsChange?: boolean; debounceMs?: number } | false`

约束：

- `autoRefresh` 只影响“是否触发 refresh”，不改变 source refresh 的 keyHash gating 与并发语义；
- 更复杂的时序（delay/retry/timeout）不进入此 API，升级到 FlowProgram（075）。

## 2) `@logixjs/query` / `@logixjs/form`：降级依赖

- Query/Form 不应再依赖 “监听 action → 决策 refresh” 的默认逻辑；
- 仅保留显式的 `refresh` action 或 controller API 作为手动入口。

