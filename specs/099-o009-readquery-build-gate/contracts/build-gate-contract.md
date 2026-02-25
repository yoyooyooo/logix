# Contract: ReadQuery Build Gate（构建期门禁）

## Required

- MUST 在构建期对 selector 进行定级并生成报告。
- MUST 支持 `mode=off|warn|error` 的 strict gate 策略。
- `mode=error` 下，任一 `strictGateVerdict=FAIL` MUST 阻断构建。
- 报告条目 MUST 可序列化，禁止包含函数/闭包。

## Required Fields

每条 `SelectorQualityEntry` 至少包含：

- `selectorId`
- `lane`
- `producer`
- `strictGateVerdict`
- `fallbackReason`（仅 dynamic）

## Stable Identity Rules

- `selectorId` MUST 可复现。
- 禁止随机/墙钟参与 `selectorId` 计算。
- 同一 module 内不得出现 `selectorId` 语义冲突。

## Failure Semantics

- 失败输出 MUST 至少包含：`moduleId + selectorId + fallbackReason + strictGateRule`。
- 失败输出 MUST 支持 `JSON.stringify`。
