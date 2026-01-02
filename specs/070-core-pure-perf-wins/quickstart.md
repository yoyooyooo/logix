# Quickstart: 070 core 纯赚/近纯赚性能优化（怎么验收）

## 1) 070 的核心目标是什么？

- 默认档（单内核 + diagnostics=off + prod/errorOnly）“不会被消费就不付费”：不为最终会被丢弃的 Debug/diagnostics payload 承担默认税。
- 显式启用 Devtools/trace/diagnostics 时仍可解释，并且关闭后回到默认零成本口径。

## 2) 怎么跑证据？

以 `specs/070-core-pure-perf-wins/plan.md` 的 `Perf Evidence Plan（MUST）` 为准：Node + Browser 都要跑 before/after/diff，并确保 `meta.comparability.comparable=true && summary.regressions==0`。

## 3) 最近一次证据（占位）

实现完成后，把最新一次 Gate 结论与 diff 文件路径回写到这里，作为交接锚点；若要主张“纯赚收益”，同时摘录至少 1 条 improvements/evidenceDeltas 作为证据（见 `spec.md` 的 SC-004）。
