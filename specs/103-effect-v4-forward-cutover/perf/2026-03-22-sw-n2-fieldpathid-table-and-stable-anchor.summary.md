# 2026-03-22 · sw-n2-fieldpathid-table-and-stable-anchor summary

## Decision

- status: `discarded_or_pending`
- accepted_with_evidence: `false`
- mergeToMain: `false`
- public API change: `false`
- closeout: `docs/evidence-only`

## Scope

- implementation scope（已回滚）:
  - `packages/logix-core/src/internal/field-path.ts`
  - `packages/logix-core/src/internal/state-trait/build.ts`
  - `packages/logix-core/src/internal/runtime/core/StateTransaction.ts`
  - `packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts`
  - `packages/logix-core/src/internal/runtime/core/SelectorGraph.ts`
  - `packages/logix-core/test/internal/**`
- docs/evidence:
  - `docs/perf/2026-03-22-sw-n2-fieldpathid-table-and-stable-anchor-impl-check.md`
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-22-sw-n2-fieldpathid-table-and-stable-anchor.evidence.json`
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-22-sw-n2-fieldpathid-table-and-stable-anchor.validation.typecheck.txt`
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-22-sw-n2-fieldpathid-table-and-stable-anchor.validation.test.txt`
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-22-sw-n2-fieldpathid-table-and-stable-anchor.probe-next-blocker.json`

## Verification snapshot

- `pnpm -C packages/logix-core typecheck:test`: passed
- `pnpm -C packages/logix-core test`: failed（clean 状态，8 file failures / 11 test failures）
- `python3 fabfile.py probe_next_blocker --json`: clear

## Why not accepted

- 成功门要求 correctness + perf gate 同时全绿。
- 本轮 perf gate 已 clear，correctness gate 未通过，因此不满足 `accepted_with_evidence`。
- 按约束回滚实现并仅保留 docs/evidence。
