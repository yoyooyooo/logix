# 2026-03-20 · p1-2-wholestate-fallback-next summary

## Decision

- status: `accepted_with_evidence`
- mergeToMain: `true`
- public API change: `false`

## Scope

- implementation:
  - `packages/logix-core/src/internal/runtime/core/StateTransaction.ts`
  - `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.reducerWholeStateFallback.Perf.off.test.ts`
- docs/evidence:
  - `docs/perf/archive/2026-03/2026-03-20-p1-2-wholestate-fallback-next.md`
  - `docs/perf/2026-03-15-v4-perf-next-cut-candidates.md`
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-20-p1-2-wholestate-fallback-next.evidence.json`
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-20-p1-2-wholestate-fallback-next.validation.json`

## Core change

- `recordKnownTopLevelDirtyEvidence` 由“全量 key 必须可映射”收紧为“只要有已知 key 就落已知 key 证据”。
- mixed-known/unknown 顶层改动不再强制走 reducer `'*'` fallback。

## Evidence pointers

- typecheck: `specs/103-effect-v4-forward-cutover/perf/2026-03-20-p1-2-wholestate-fallback-next.validation.typecheck.txt`
- targeted vitest: `specs/103-effect-v4-forward-cutover/perf/2026-03-20-p1-2-wholestate-fallback-next.validation.vitest.txt`
- probe: `specs/103-effect-v4-forward-cutover/perf/2026-03-20-p1-2-wholestate-fallback-next.probe-next-blocker.json`
