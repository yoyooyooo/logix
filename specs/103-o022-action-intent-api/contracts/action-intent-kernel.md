# Contract: ActionIntent Kernel (O-022)

## Kernel Responsibilities

- 统一入口归一：`dispatchers` / `action(token)` / `dispatch(*)` -> `ActionIntent`。
- ActionIntent 最小字段（Slim + 可序列化）：
  - `action`：最终派发的 action value；
  - `actionTag`：归一后的 action tag；
  - `source.entry`：`dispatchers | action | dispatch`；
  - `source.input`：`token | type | value`。
- 统一诊断锚点：通过 `TxnOriginOverride` 写入
  - `kind = "action-intent"`
  - `name = source.entry`
  - `details = { actionIntent: true, entry, input, actionTag }`
- 对上层 facade 暴露稳定调用契约，`dispatchers` 保持缓存与薄封装。
- 未注册 tag/token 的诊断一致性约束以 `$.action(token)` 与 `$.dispatch(type,payload)` 为准；
  `$.dispatchers` 仅暴露已声明 action key 的静态入口（不提供未注册 key 的动态兜底）。

## Non-Goals

- 不在 facade 层重复业务逻辑。
- 不引入并行 action 执行真相源。
