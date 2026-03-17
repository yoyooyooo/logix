# 2026-03-21 · P1-4B-min RuntimeExternalStore module pulse hub（accepted_with_evidence）

## 目标与边界

- worktree：`/Users/yoyo/Documents/code/personal/logix.worktrees/v4-perf.p1-4b-module-pulse-hub`
- branch：`agent/v4-perf-p1-4b-module-pulse-hub`
- 唯一目标：实施 `P1-4B-min RuntimeExternalStore module pulse hub`
- 禁区：
  - 不改 `packages/logix-core/**`
  - 不改 public API
  - 不回到 `shared microtask flush` 或 `dirtyTopics single-pass classification`

## 实施结果

### 代码切口

- `RuntimeExternalStore` 新增按 `moduleInstanceKey` 聚合的 `modulePulseHub`。
- 同一 module 下多个 topic（module topic + readQuery topic）在同一波次通知中共享一次调度窗口。
- hub 以“最高优先级”决定 flush 路径：
  - 有 `normal` 时走 microtask。
  - 全部为 `low` 时保持 delay/maxDelay 语义，并用 module 级单窗口合并。
- `topicVersion` 读取与 `getSnapshot` 逻辑保持原语义。
- `useSelector` shared subscription 逻辑未改，原回归测试继续通过。

### 测试补强

- 在 `RuntimeExternalStore.lowPriority.test.ts` 增加跨 topic 场景：
  - 同一 module 的 module/readQuery 两个 external store 触发 lowPriority 更新时，只出现一个 raf 窗口。
  - 两路订阅回调都只触发一次，证明 bridge pulse 收敛成立。

## 证据与验证

最小验证命令全部通过：

- `pnpm -C packages/logix-react typecheck:test`
- `pnpm -C packages/logix-react test -- RuntimeExternalStore.lowPriority.test.ts`
- `pnpm -C packages/logix-react test -- useSelector.sharedSubscription.test.tsx`
- `python3 fabfile.py probe_next_blocker --json`

`probe_next_blocker` 结果：`status=clear`，3 个默认 gate 均 `passed`，无 threshold anomaly。

证据文件：

- `specs/103-effect-v4-forward-cutover/perf/2026-03-21-p1-4b-module-pulse-hub-impl.probe-next-blocker.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-21-p1-4b-module-pulse-hub-impl.validation.typecheck.txt`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-21-p1-4b-module-pulse-hub-impl.validation.lowpriority.txt`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-21-p1-4b-module-pulse-hub-impl.validation.shared-subscription.txt`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-21-p1-4b-module-pulse-hub-impl.evidence.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-21-p1-4b-module-pulse-hub-impl.summary.md`

## 裁决

- 结果分类：`accepted_with_evidence`
- 结论：保留实现，不回滚为 docs-only
