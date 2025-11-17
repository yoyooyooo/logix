# Contract: Devtools Selector Lane Evidence（车道/降级/对齐）

## Required

- Devtools MUST 能区分 selector 的车道：`static|dynamic`，并能解释降级原因（`fallbackReason`）。
- `trace:react-selector` 的 meta MUST 至少携带：`selectorId`、`lane`、`producer`、`fallbackReason?`、`readsDigest?`（light 档位保持 Slim）。
- Runtime MUST 提供 selector eval 级事件（例如 `trace:selector:eval`），并能与 `moduleId/instanceId/txnSeq` 对齐；用于串起 txn → selector → render 因果链。
  - `trace:selector:eval` 的 meta MUST 至少携带：`selectorId`、`lane`、`producer`、`fallbackReason?`、`readsDigest?`、`equalsKind?`、`changed`、`evalMs`（best-effort，单位毫秒；light 档位保持 Slim）。
- `diagnostics=off` 下不得产生常驻分配或 O(n) 扫描；事件写入必须可关闭且可预算化（light/full）。

## FallbackReason（frozen enum）

`fallbackReason` MUST 使用冻结的最小枚举，避免 Devtools 聚合与 strict gate deny 列表漂移：

- `missingDeps`
- `unsupportedSyntax`
- `unstableSelectorId`
