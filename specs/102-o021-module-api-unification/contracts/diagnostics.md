# Contract: Diagnostics (O-021)

## Event Requirements

- 实例化相关事件必须包含稳定锚点：`instanceId/txnSeq`；`opSeq` 仅在操作级（op-scoped）事件中要求。
- 事件 payload 必须 Slim、可序列化。
- 诊断关闭时不应引入可观测热路径开销。

## Explainability

- 诊断错误事件必须提供 `code + message`；`hint/source` 在可用时提供。
- 迁移期间旧入口触发时，必须给出可执行迁移提示。
