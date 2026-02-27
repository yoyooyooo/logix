# O-022 Perf Evidence

## Commands

```bash
pnpm perf collect -- --profile quick --out specs/103-o022-action-intent-api/perf/before.local.quick.json
pnpm perf collect -- --profile quick --out specs/103-o022-action-intent-api/perf/after.local.quick.json
pnpm perf diff -- --before specs/103-o022-action-intent-api/perf/before.local.quick.json --after specs/103-o022-action-intent-api/perf/after.local.quick.json --out specs/103-o022-action-intent-api/perf/diff.before__after.quick.json
pnpm --filter @logixjs/core test -- test/internal/Bound/Bound.ActionIntent.Perf.off.test.ts
```

## Result Snapshot

- `comparable=true`
- `regressions=12`
- `improvements=5`
- `budgetViolations=0`
- O-022 专用三入口微基准（`dispatchers/action/dispatch`，轮转顺序消除先后偏置）：
  - `ops=1500, iters=6, warmup=1, attempts=3`
  - `dispatchers.p50=133.984ms`
  - `action.p50=135.789ms`
  - `dispatch.p50=137.562ms`
  - `median.ratio(dispatchers/action)=1.004`（<= `1.05` 预算）
  - `median.ratio(dispatchers/dispatch)=0.987`（<= `1.2` 兼容预算）
  - `median.ratio(dispatchersVsAction)=1.010`（观测指标；可选严格门禁）
  - 结构化产物：`specs/103-o022-action-intent-api/perf/entry.off.local.json`

## Notes

- 本次为同工作树 `quick` profile 的 before/after 采样，主要用于 O-022 改动后的可复现证据落点。
- diff 中存在 `git.dirty.before=true` 与 `git.dirty.after=true`，说明工作树并非洁净快照，结论仅用于本次任务内对比，不作为跨分支发布门禁。
- 三入口微基准来自 `Bound.ActionIntent.Perf.off.test.ts` 的单次可复现输出，不依赖 clean worktree 对比，可直接用于 O-022 热路径预算回归检查。
- 本任务阻断门禁（默认）：
  - `median.p50DispatchersOverAction <= 1.05`
  - `median.p50DispatchersOverDispatch <= 1.2`
- `median.p50DispatchersVsAction` 默认为观测指标；若需开启对称严格门禁，可设置
  `LOGIX_ACTION_ENTRY_SYMMETRIC_MAX_RATIO=<ratio>`。
- 可配置环境变量统一为 `LOGIX_ACTION_ENTRY_*`；
  `diff.before__after.quick.json` 仅作趋势观察，不作为阻断条件。
