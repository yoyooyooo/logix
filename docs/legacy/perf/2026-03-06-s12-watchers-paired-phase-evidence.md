# 2026-03-06 · S-12：watchers paired phase evidence

本线不做 runtime cut，也不改 public API。目标是把 `watchers.clickToPaint` 剩余红样本的解释链，从“对比两次独立 suite 的聚合结果”收紧成“直接读取同一次 sample 内的 phase evidence”。

## 问题

`S-2` 第一刀已经把 watchers 拆成：
- `watchers.clickToPaint`：click -> DOM stable -> next frame
- `watchers.clickToDomStable`：click -> DOM stable

但这两个 suite 仍各自执行一次独立的 `runMatrixSuite(...)`。因此：
- `clickToPaint - clickToDomStable` 不是同一次 click/sample 的真实 phase gap
- 当 `clickToPaint` 超线时，结论仍然要依赖“跨 suite 对比”，解释链不够硬

本刀的目标不是再拆 suite，而是先让每个 red sample 自己带上 phase 证据，直接回答“超线主要落在哪一段”。

## 改动

- `packages/logix-react/test/browser/watcher-browser-perf.test.tsx`
  - 在单次 click sample 内记录 `onClick` handler 起点
  - 每次 sample 同时产出：
    - `watchers.phase.clickToHandlerMs`
    - `watchers.phase.handlerToDomStableMs`
    - `watchers.phase.domStableToPaintGapMs`
  - 两个现有 watchers suite 都继续保留原 metric，但改为额外附带同 sample 的 phase evidence
- `.codex/skills/logix-perf-evidence/assets/matrix.json`
  - 为两个 watchers suite 显式声明 `requiredEvidence`
  - notes 改成“优先读同 sample phase evidence，而不是两条独立 suite 的差值”
- `packages/logix-react/test/browser/perf-boundaries/harness.ts`
- `.codex/skills/logix-perf-evidence/scripts/diff.ts`
- `.codex/skills/logix-perf-evidence/assets/schemas/perf-report.schema.json`
- `.codex/skills/logix-perf-evidence/assets/schemas/perf-diff.schema.json`
  - evidence unit 扩成支持 `ms`
  - 让 phase 毫秒证据不再被错误标成 `count`

## 关键读数

基于 `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.s12-watchers-paired-phase-evidence.targeted.json` 的 `watchers.clickToPaint` suite：

phase 范围（14 个点位的 point-level evidence 中位数范围）：
- `clickToHandlerMs`: `29.2ms ~ 39.4ms`，中位 `35.9ms`
- `handlerToDomStableMs`: `8.4ms ~ 16.6ms`，中位 `13.3ms`
- `domStableToPaintGapMs`: `3.4ms ~ 10.1ms`，中位 `6.6ms`

代表性 red sample：
- `watchers=64, reactStrictMode=false`
  - `clickToPaint.p95=76.9ms`
  - phase evidence: `32.2ms + 16.6ms + 5.6ms`
- `watchers=256, reactStrictMode=false`
  - `clickToPaint.median=62.2ms`, `p95=71.2ms`
  - phase evidence: `38.5ms + 14.3ms + 5.2ms`
- `watchers=512, reactStrictMode=true`
  - `clickToPaint.median=62.2ms`, `p95=69.4ms`
  - phase evidence: `36.2ms + 13.3ms + 10.1ms`

## 裁决

1. phase evidence 已稳定落到同一次 sample 内。
- 不再需要用 `clickToPaint` 与 `clickToDomStable` 两条独立 suite 的聚合差值，去反推 paint gap。
- 以后看 red sample，直接读该点位自带的 phase evidence 即可。

2. `clickToPaint` 当前超线并不主要由 `DOM stable -> paint-ish` 一段决定。
- `domStableToPaintGapMs` 大多只在 `3ms ~ 10ms`。
- 更大的份额主要落在 `clickToHandler` 与 `handlerToDomStable`。

3. 这条线仍是 benchmark 解释链问题，不是新的 runtime core blocker。
- 当前证据更适合指导文档/展示层收口，而不是重新打开 watcher runtime 内核 cut。

## 验证

- `pnpm -C packages/logix-react typecheck:test`
  - 通过
- `pnpm -C packages/logix-react test -- --project browser test/browser/watcher-browser-perf.test.tsx`
  - 首次因 fresh worktree + Vite optimizeDeps reload 失败一次
  - 复跑后通过
- `pnpm perf collect -- --profile quick --files test/browser/watcher-browser-perf.test.tsx --out specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.s12-watchers-paired-phase-evidence.targeted.json`
  - 通过
- `pnpm perf diff:triage -- --before specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.s2-watchers-semantic-split.targeted.json --after specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.s12-watchers-paired-phase-evidence.targeted.json --out specs/103-effect-v4-forward-cutover/perf/s2.diff.local.quick.s12-vs-s2-watchers-paired-phase-evidence.triage.json`
  - 通过
  - 但仅能作 triage：`matrixHash`、branch、node 版本均有 drift，`comparable=false`
  - diff 没有给出新的 metric regression/improvement 结论；本刀的主要新增价值是 phase evidence，而不是 primary metric 改写

## 证据

- `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.s12-watchers-paired-phase-evidence.targeted.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.diff.local.quick.s12-vs-s2-watchers-paired-phase-evidence.triage.json`

## 回写

- `docs/perf/README.md`
- `docs/perf/06-current-head-triage.md`
- `docs/perf/07-optimization-backlog-and-routing.md`

## 后续

- `S-2` 只剩展示/汇总层收口：
  - 让 report / triage 页面更直接显示 `watchers.phase.*Ms`
  - 明确告诉后续 agent：不要再对两条独立 suite 的聚合结果做减法解释
