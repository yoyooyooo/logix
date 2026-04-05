# 2026-03-06 · S-13：watchers phase display

本刀不做 runtime cut，也不改 public API。目标是把 `S-12` 已经落盘的 `watchers.phase.*Ms`，从“diff JSON 里有数据”提升成“triage / report 第一眼可见”，并明确禁止后续 agent 再用两条独立 suite 的聚合差值解释 watchers 红样本。

## 缺口确认

`S-12` 之后，`watchers.phase.clickToHandlerMs` / `watchers.phase.handlerToDomStableMs` / `watchers.phase.domStableToPaintGapMs` 已经稳定落在 `PerfDiff.suites[].evidenceDeltas`。

但现状仍有两个展示层缺口：

1. `PerfDiff.summary` 只有 `regressions / improvements / slices`，没有把 watchers paired phase 提升成首屏 highlight。
2. `pnpm perf ci:interpret` 默认只看 comparability / regressions / top regressions，不会主动把 `watchers.phase.*Ms` 打到 artifact 解读顶部。

结果是：
- 人仍然容易先看 `watchers.clickToPaint` / `watchers.clickToDomStable` 两条 suite 的聚合指标；
- phase evidence 虽然在 JSON 里，但不够显眼；
- 后续 agent 仍可能回到错误口径：用两条独立 suite 的聚合差值去解释单次 red sample。

## 本刀实现

### 1. diff / triage 首屏 highlight

在 `.codex/skills/logix-perf-evidence/scripts/diff.ts` 中新增 watchers 专用 display 生成：

- `summary.highlights[]`
  - `kind=watchersPairedPhase`
  - 直接给出每条 watchers suite 的 paired phase headline
- `suites[].watchersPhaseDisplay`
  - 结构化暴露三个 phase 的 after 中位数、dominant segment、share
- `suites[].notes`
  - 也会前置 paired phase headline + guidance，避免旧消费者只读 `notes` 时仍看不到这条信息

headline 口径示例：
- `watchers.clickToPaint paired phase(after median): clickToHandler=35.9ms, handlerToDomStable=13.3ms, domStableToPaintGap=6.6ms; dominant=clickToHandler (64.3%)`

### 2. 禁止跨 suite 做减法

每条 watchers display 都带固定 guidance：

- `use paired phase evidence from this suite sample; do not subtract independent suite aggregates such as watchers.clickToPaint - watchers.clickToDomStable`

这条 guidance 同时进入：
- `summary.highlights[]`
- `suites[].watchersPhaseDisplay.guidance`
- `suites[].notes`

也就是说，即使后续 agent 只看 summary、只看 suite display、或只看 notes，都会直接看到“不要再拿两条独立 suite 做减法”的裁决。

### 3. artifact report 首屏展示

在 `.codex/skills/logix-perf-evidence/scripts/ci.interpret-artifact.ts` 中新增 `triage highlights` 段：

- 先输出 comparability / regressions
- 再输出 watchers paired phase headline + guidance
- 最后才进入 warnings / top regressions

这样 artifact 解读第一页就能看到主要成本段，而不是先被 generic regression 列表淹没。

## 验证

使用 `S-12` 已有的 before/after 报告，不重新 collect 大体积样本：

```bash
pnpm perf diff:triage -- \
  --before specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.s2-watchers-semantic-split.targeted.json \
  --after specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.s12-watchers-paired-phase-evidence.targeted.json \
  --out /tmp/s13-watchers-phase-display-artifact/diff.watchers-phase-display.json

pnpm perf ci:interpret -- \
  --artifact /tmp/s13-watchers-phase-display-artifact \
  --prefer any
```

本地验证结果（triage-only，`comparable=false`，原因仍是 `matrixHash` / git / node drift）：

- `summary.highlights` 已直接给出：
  - `watchers.clickToDomStable paired phase(after median): clickToHandler=34.7ms, handlerToDomStable=14.0ms, domStableToPaintGap=6.7ms; dominant=clickToHandler (62.6%)`
  - `watchers.clickToPaint paired phase(after median): clickToHandler=35.9ms, handlerToDomStable=13.3ms, domStableToPaintGap=6.6ms; dominant=clickToHandler (64.3%)`
- `suites[].watchersPhaseDisplay` 已带结构化 segment/share 信息。
- `pnpm perf ci:interpret` 已把上述 headline 放到 `**triage highlights**` 段，并同步输出禁止跨 suite 做减法的 guidance。

另外补了一条最小回归测试：

- `.codex/skills/logix-perf-evidence/scripts/watchers-phase-display.test.ts`
  - 验证 paired phase display 会生成 headline / dominant phase / guidance
  - 验证非 watchers suite 或缺失 after 值时不会误生成 display

## 结论

`S-13` 把 `S-12` 的 paired phase evidence 从“底层数据存在”推进到了“汇总层第一眼可见”：

1. 看 watchers 红样本时，不再需要人工去两条 suite 做减法。
2. diff / triage / artifact report 都会直接指出主要成本段。
3. “禁止跨 suite 聚合差值解释 watchers” 已被写进结构化 display 与 notes，不再依赖口头约定。
