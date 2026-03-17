# 2026-03-21 · P1-4C-min PulseEnvelope v0 + SelectorDeltaTopK 实施记录（accepted_with_evidence）

## 目标与边界

- worktree：`/Users/yoyo/Documents/code/personal/logix.worktrees/v4-perf.p1-4c-pulse-envelope-impl`
- branch：`agent/v4-perf-p1-4c-pulse-envelope-impl`
- 唯一目标：实施 `P1-4C-min PulseEnvelope v0 + SelectorDeltaTopK` 的最小切口。
- 改动边界：
  - `packages/logix-react/src/internal/store/RuntimeExternalStore.ts`
  - `packages/logix-react/src/internal/hooks/useSelector.ts`
  - `packages/logix-react/test/internal/RuntimeExternalStore.lowPriority.test.ts`
  - `packages/logix-react/test/Hooks/useSelector.sharedSubscription.test.tsx`
- 禁区遵守：
  - 未改 `packages/logix-core/**`
  - 未改 public API
  - 未回到 `shared microtask flush` / `dirtyTopics single-pass classification`

## 实施内容

1. `RuntimeExternalStore` 内部引入 `RuntimePulseEnvelope` 与 `SelectorDeltaTopK`，并通过 modulePulseHub 聚合产出。
2. `SelectorDeltaTopK` 使用 4-word bloom + topK + hash，语义保持“允许误报，禁止漏报”。
3. modulePulseHub 的 envelope 聚合改为增量累计，避免每次 flush 的排序与大分配。
4. `subscribeRuntimeExternalStoreWithComponentMultiplex` 支持 `shouldNotify`，并在 lead hook 不可通知时自动选择下一个可通知 hook。
5. `useSelector` 接入保守跳过：
   - 若 envelope 明确 selector 未变化，直接跳过通知。
   - 否则基于 `store.getSnapshot + equalityFn` 做二次保守判定。

## 测试与证据

最小验证命令全部通过：

- `pnpm -C packages/logix-react typecheck:test`
- `pnpm -C packages/logix-react test -- RuntimeExternalStore.lowPriority.test.ts`
- `pnpm -C packages/logix-react test -- useSelector.sharedSubscription.test.tsx`
- `python3 fabfile.py probe_next_blocker --json`

关键新增证据：

- `RuntimeExternalStore.lowPriority.test.ts` 新增 envelope 断言，验证 `topicDeltaCount/topicDeltaHash/selectorDelta`。
- `useSelector.sharedSubscription.test.tsx` 新增“lead selector 未变化时仍可命中变化 hook”场景，验证保守跳过不引入漏通知。
- `probe_next_blocker` 结果 `status=clear`，3 个 gate 全通过，`threshold_anomalies=[]`。

## 裁决

- 结果分类：`accepted_with_evidence`
- 结论：保留实现，不回滚 docs/evidence-only。

## 交叉引用

- 设计包：`docs/perf/2026-03-21-p1-4c-moduleinstance-pulse-envelope-selector-delta-payload-design.md`
- 本次 summary：`specs/103-effect-v4-forward-cutover/perf/2026-03-21-p1-4c-min-pulse-envelope-selector-delta-impl.summary.md`
- 本次 evidence：`specs/103-effect-v4-forward-cutover/perf/2026-03-21-p1-4c-min-pulse-envelope-selector-delta-impl.evidence.json`
