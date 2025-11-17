# Research: 052 diagnostics=off 近零成本 Gate（回归防线）

本 research 用于把 off 档位的“禁止项”与覆盖面收敛到可执行清单。

## Decision 1：off 禁止项（最小集合）

**Chosen**：

- 不分配 steps/hotspots 数组
- 不拼接 stepLabel/traceKey
- 不做 per-step 计时（必要时用 sampling 且仅 light/full）
- 不 materialize id→readable mapping（mapping 仅 light/full，且必须在边界一次性生成）

## Decision 2：证据门禁与覆盖

**Chosen**：

- Browser：`diagnostics.overhead.e2e` 作为主口径（039 已有基线），本 spec 负责把它变成全局 gate
- Node：至少覆盖 `converge.txnCommit`（必要时追加 txn/dispatch 相关 bench）

## Decision 3：与 049/050/051 的边界

**Chosen**：052 只定义 off gate 与回归防线；不重新定义 Exec VM/Integer Bridge/txn zero-alloc 的语义与实现细节。

## Decision 4：证据门禁（Node + Browser）与隔离采集

**Chosen**：

- Matrix SSoT：`.codex/skills/logix-perf-evidence/assets/matrix.json`
- 交付 profile：`default`（或 `soak`）；并要求 `pnpm perf diff` 输出 `meta.comparability.comparable=true` 且 `summary.regressions==0`
- before/after/diff 必须在隔离 worktree/目录分别采集（混杂结果仅作线索）
- Node+Browser 任一失败整体 FAIL

## Decision 5：off 近零成本边界与最小锚点

**Chosen**：

- 允许 begin/commit 的常数级分配（例如一次性最小锚点对象/固定字段写入），但禁止热循环按 step/patch 增长的分配（steps/hotspots 数组、per-step 字符串、per-step `now()`）。
- off 仅允许输出固定字段锚点（instanceId/txnSeq/opSeq 等），必须 Slim、可序列化、无数组；mapping/labels/reason 文本仅 light/full。
