# 2026-03-20 · P1-4 cross-plane topic next（evidence-only）

## 本轮目标

- 在 `aa7c0b50` 基线上，一轮内判断是否存在“可最小收成”的 P1-4 cross-plane 切口。
- 仅允许以下写入范围：`RuntimeStore.ts`、`TickScheduler.ts`、`RuntimeExternalStore.ts` 与对应测试/证据文档。
- 明确排除失败切口：`normal-path shared microtask flush`、`p3 no-prod-txn-history`、`p4 DevtoolsHub projection hints`、`p5 full-lazy raw eager-only meta`、`p6 full-lazy traitConverge heavy decision/detail`。

## 一轮裁决结果

- 本轮评估过的最小候选切口：`TickScheduler` 对 `dirtyTopics` 的单次分类收口（减少同 tick 内重复解析/重复遍历）。
- 该候选没有形成“跨 plane 可归因收益”证据，且当前证据强度不足以按 `accepted_with_evidence` 吸收代码。
- 按失败门执行：不保留实现改动，转为 docs/evidence-only。

## 验证与证据

- `pnpm -C packages/logix-core typecheck:test`：通过。
- `pnpm -C packages/logix-react typecheck:test`：通过。
- `python3 fabfile.py probe_next_blocker --json`：`status=clear`，落盘：
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-20-p1-4-crossplane-topic-next.probe-next-blocker.json`

## 结论

- 本轮无代码落地，仅沉淀证据与裁决。
- 结果分类：`discarded_or_pending`（docs/evidence-only）。
- `accepted_with_evidence=false`。
