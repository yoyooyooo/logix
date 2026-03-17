# 2026-03-21 · sw-n1-patch-contract-hardening summary

## Decision

- status: `accepted_with_evidence`
- mergeToMain: `true`
- public API change: `false`

## Scope

- implementation:
  - `packages/logix-core/src/internal/runtime/core/StateTransaction.ts`
  - `packages/logix-core/src/internal/runtime/core/ModuleRuntime.dispatch.ts`
  - `packages/logix-core/src/internal/runtime/core/BoundApiRuntime.ts`
  - `packages/logix-core/src/internal/state-trait/external-store.ts`
- tests:
  - `packages/logix-core/test/internal/Bound/BoundApiRuntime.stateUpdateWholeStateFallback.Perf.off.test.ts`
  - `packages/logix-core/test/internal/StateTrait/StateTrait.ExternalStoreTrait.Runtime.test.ts`
- docs/evidence:
  - `docs/perf/archive/2026-03/2026-03-21-sw-n1-patch-contract-hardening.md`
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-21-sw-n1-patch-contract-hardening.evidence.json`
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-21-sw-n1-patch-contract-hardening.validation.json`

## Core change

- `dispatch/reducer` 与 `BoundApi.state.update` 在无法提供 patch-first 证据时，转为显式契约降级（`customMutation`），不再依赖 `'*'` 推导补救。
- `StateTransaction` 将目标入口的 `registry` 缺失归并为契约语义 `customMutation`，减少 `fallbackPolicy` 的运行时补救含义。
- `externalStore/module-as-source` 的非法 `fieldPath` 在安装阶段 fail-fast，移除“原样字符串补救”路径。

## Evidence pointers

- typecheck: `specs/103-effect-v4-forward-cutover/perf/2026-03-21-sw-n1-patch-contract-hardening.validation.typecheck.txt`
- targeted vitest: `specs/103-effect-v4-forward-cutover/perf/2026-03-21-sw-n1-patch-contract-hardening.validation.vitest.txt`
- probe: `specs/103-effect-v4-forward-cutover/perf/2026-03-21-sw-n1-patch-contract-hardening.probe-next-blocker.json`
