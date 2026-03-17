# 2026-03-21 · SW-N1 Patch-first state write contract hardening（最小切口）

## 结论

- status: `accepted_with_evidence`
- public API change: `false`
- merge policy: `implementation + docs/evidence`（单线收口）

## 目标与边界

本切口只做 `state write` 入口契约收紧，不新增调度语义，不改 public API。

- 覆盖入口：
  - `dispatch/reducer` 写回
  - `BoundApi.state.update`
  - `StateTrait.externalStore`
  - `module-as-source`（复用 externalStore 写回路径）
- 收紧目标：
  - 减少运行时对 `'*'` + commit-time 推导的依赖
  - 将 `registry` 缺失从“fallbackPolicy 补救”统一到“customMutation 契约降级”

## 实施要点

1. `ModuleRuntime.dispatch.ts`
- reducer / action writeback 在无 patchPaths 且无法落 top-level known evidence 时，不再写 `'*'`。
- 统一改为显式契约降级（`recordStatePatch(undefined, ...)`）。
- 诊断码从推导提示转为 `state_transaction::patch_contract_degraded`。

2. `BoundApiRuntime.ts`
- `state.update` 的 top-level fallback 不再走 `runtime.setState(next)` 的隐式 `'*'` 路径。
- 对空变更、非法 key、schema 未声明 key，统一显式降级为 `customMutation`。

3. `StateTransaction.ts`
- 针对 `reducer / unknown / trait-external-store`，`registry` 缺失不再给 `fallbackPolicy`，统一记为 `customMutation`。
- 目的：把入口契约缺失与路径映射缺失统一到同一类可诊断语义。

4. `external-store.ts`
- `fieldPath` 无法规范化时 fail-fast，不再保留“原始字符串 best-effort”补救路径。
- 该约束同时覆盖普通 externalStore 与 module-as-source 分支（共享 patchPath 解析）。

## 验证

- `pnpm -C packages/logix-core typecheck:test`：passed
- `pnpm -C packages/logix-core exec vitest run test/internal/FieldPath/FieldPath.DirtySetReason.test.ts test/internal/Bound/BoundApiRuntime.stateUpdateWholeStateFallback.Perf.off.test.ts test/internal/Runtime/ModuleRuntime/ModuleRuntime.reducerWholeStateFallback.Perf.off.test.ts test/internal/StateTrait/StateTrait.ExternalStoreTrait.Runtime.test.ts`：passed
- `python3 fabfile.py probe_next_blocker --json`：`status=clear`, `blocker=null`, `thresholdAnomalyCount=0`

## 证据落点

- `specs/103-effect-v4-forward-cutover/perf/2026-03-21-sw-n1-patch-contract-hardening.evidence.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-21-sw-n1-patch-contract-hardening.validation.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-21-sw-n1-patch-contract-hardening.validation.typecheck.txt`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-21-sw-n1-patch-contract-hardening.validation.vitest.txt`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-21-sw-n1-patch-contract-hardening.probe-next-blocker.json`
