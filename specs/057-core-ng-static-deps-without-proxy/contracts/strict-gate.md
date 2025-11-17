# Contract: Strict Gate（把 dynamic 回退升级为失败）

## Required

- Strict gate MUST 可在 CI/perf gate 场景启用，用于阻断“以为已静态化但实际跑 dynamic”。
- 失败输出 MUST 结构化且可序列化，至少包含：`moduleId/instanceId/txnSeq + selectorId + debugKey? + fallbackReason`。
- 默认运行（非 strict）下 MUST 保持可用：dynamic 作为兜底允许存在，但必须可观测/可审计。

## FallbackReason（frozen enum）

strict gate 的 `denyFallbackReasons` MUST 使用冻结的最小枚举（同 Devtools 口径），避免漂移：

- `missingDeps`
- `unsupportedSyntax`
- `unstableSelectorId`
