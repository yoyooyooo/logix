# 2026-03-20 · p1-2-next-expansion summary

## Decision

- status: `discarded_or_pending`
- accepted_with_evidence: `false`
- mergeToMain: `false`（code reverted, docs/evidence-only）
- public API change: `false`

## Scope

- attempted implementation (reverted):
  - `packages/logix-core/src/internal/runtime/core/BoundApiRuntime.ts`
  - `packages/logix-core/test/internal/Bound/BoundApiRuntime.stateUpdateWholeStateFallback.Perf.off.test.ts`
- docs/evidence:
  - `docs/perf/archive/2026-03/2026-03-20-p1-2-next-expansion-evidence-only.md`
  - `docs/perf/2026-03-15-v4-perf-next-cut-candidates.md`
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-20-p1-2-next-expansion.evidence.json`
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-20-p1-2-next-expansion.validation.json`

## Core conclusion

- 本轮试探方向：进一步收紧 `BoundApi.state.update` mixed-known/unknown 写路径。
- 三轮采样结果方向不稳定，且 mixedUnknown 有回摆，未形成可归因硬收益。
- 按 failure gate 执行：回滚实现，保留 docs/evidence-only。

## Evidence pointers

- typecheck: `specs/103-effect-v4-forward-cutover/perf/2026-03-20-p1-2-next-expansion.validation.typecheck.txt`
- targeted vitest: `specs/103-effect-v4-forward-cutover/perf/2026-03-20-p1-2-next-expansion.validation.vitest.txt`
- probe: `specs/103-effect-v4-forward-cutover/perf/2026-03-20-p1-2-next-expansion.probe-next-blocker.json`
