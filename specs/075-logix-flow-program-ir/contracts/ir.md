# Contracts: IR（FlowProgramStaticIr）

> 本文固化 FlowProgram 的 Static IR 口径；Dynamic Trace 只携带锚点与摘要（见 diagnostics）。

## 1) Static IR（V1）

- 必须 JSON 可序列化
- 必须带 `version` 与 `digest`
- 必须去随机化：`programId/nodeId` 不得依赖时间/随机默认

概念形态见 `specs/075-logix-flow-program-ir/data-model.md#1-static-ir`。

## 2) 扩展策略

- 同一 `version` 内只允许新增可选字段；解析器忽略未知字段（向前兼容解析）。
- 遇到未知 `version` 必须 fail-fast 并提示升级（避免静默误解释导致证据漂移）。

