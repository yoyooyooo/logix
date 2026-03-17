# 2026-03-22 · SW-N2 Static FieldPathId table and stable anchor plumbing（docs/evidence-only 收口）

## 结论

- status: `discarded_or_pending`
- accepted_with_evidence: `false`
- public API change: `false`
- merge policy: `docs/evidence-only`

本轮尝试过 `SW-N2` 的最小实现切口，随后按验证门回滚全部实现与测试改动，仅保留证据与结论。

## 目标与边界

- 目标：在不改 public API 的前提下，验证 `SW-N2` 最小切口是否能安全推进到 id-first / stable-anchor-first。
- 允许写入范围：
  - `packages/logix-core/src/internal/field-path.ts`
  - `packages/logix-core/src/internal/state-trait/build.ts`
  - `packages/logix-core/src/internal/runtime/core/StateTransaction.ts`
  - `packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts`
  - `packages/logix-core/src/internal/runtime/core/SelectorGraph.ts`
  - `packages/logix-core/test/internal/**`
  - `docs/perf/**`
  - `specs/103-effect-v4-forward-cutover/perf/**`
- 禁区遵守：未触达 `packages/logix-react/**`、`packages/logix-core/src/Runtime.ts`，未引入 public API 变更。

## 本轮结果

1. 实施尝试已完成并在工作区内验证过一轮 targeted tests。
2. 按成功门重跑最小验证后：
   - `pnpm -C packages/logix-core typecheck:test`：通过。
   - `pnpm -C packages/logix-core test`：失败（clean 状态下仍有既有失败项，见下方证据）。
   - `python3 fabfile.py probe_next_blocker --json`：`status=clear`。
3. 由于 correctness gate 未全绿，且本轮没有可归因的硬收益证据，按约束回滚全部实现改动并以 docs/evidence-only 收口。

## correctness gate 失败摘要（clean 状态）

来自 `specs/103-effect-v4-forward-cutover/perf/2026-03-22-sw-n2-fieldpathid-table-and-stable-anchor.validation.test.txt`：

- 汇总：`Test Files 8 failed | 299 passed (307)`，`Tests 11 failed | 706 passed | 1 skipped (718)`。
- 代表性失败：
  - `test/Process/Process.ErrorPolicy.Supervise.test.ts`
  - `test/StateTrait/StateTrait.ConvergeAuto.DiagnosticsLevels.test.ts`
  - `test/internal/Runtime/DeclarativeLinkIR.boundary.test.ts`
  - `test/internal/Runtime/WorkflowRuntime.075.test.ts`
  - `test/internal/Runtime/ConcurrencyPolicy/ConcurrencyPolicy.ResolveCache.test.ts`
  - `test/internal/Runtime/ModuleRuntime/ModuleRuntime.operationRunner.ExistingLinkInline.Perf.off.test.ts`
  - `test/internal/Runtime/ModuleRuntime/ModuleRuntime.operationRunner.Perf.off.test.ts`

## perf gate 摘要

来自 `specs/103-effect-v4-forward-cutover/perf/2026-03-22-sw-n2-fieldpathid-table-and-stable-anchor.probe-next-blocker.json`：

- `status=clear`
- 三个目标 suite 均 `passed`
- `threshold_anomaly_count=0`

## 证据落点

- `specs/103-effect-v4-forward-cutover/perf/2026-03-22-sw-n2-fieldpathid-table-and-stable-anchor.validation.typecheck.txt`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-22-sw-n2-fieldpathid-table-and-stable-anchor.validation.test.txt`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-22-sw-n2-fieldpathid-table-and-stable-anchor.probe-next-blocker.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-22-sw-n2-fieldpathid-table-and-stable-anchor.evidence.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-22-sw-n2-fieldpathid-table-and-stable-anchor.summary.md`

## 后续建议

- 在不改变 `SW-N2` 目标的前提下，先把 `pnpm -C packages/logix-core test` 恢复到可复现全绿，再重开实现线。
- 重开时继续遵守“若无硬收益或引入新退化则回滚实现”的收口纪律。
