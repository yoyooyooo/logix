# Tasks: Source Auto-Trigger Kernel（dirtyPaths + depsIndex）

**Input**: Design documents from `specs/076-logix-source-auto-trigger-kernel/`  
**Prerequisites**: `spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/*`, `quickstart.md`  
**Tests**: REQUIRED（语义 + perf evidence）

## Format: `[ID] [P?] Description with file path`

- `[P]`：可并行（不同文件/无强前置）
- `GATE:`：主干语义护栏（阻断后续迁移/删除胶水）

---

## Phase 1: Contracts & IR

- [ ] T001 GATE: Define `StateTrait.source` auto-trigger policy (replace `triggers/debounceMs` reflection) in `packages/logix-core/src/StateTrait.ts` + `specs/076-logix-source-auto-trigger-kernel/contracts/public-api.md`
- [ ] T002 [P] Export policy in StateTrait Static IR (`policy.autoRefresh`) in `packages/logix-core/src/internal/state-trait/ir.ts` + `specs/076-logix-source-auto-trigger-kernel/contracts/ir.md`
- [ ] T003 [P] Define diagnostics contract for auto-trigger (reason/tickSeq/debounce stats) in `specs/076-logix-source-auto-trigger-kernel/contracts/diagnostics.md`

## Phase 2: Core Kernel (depsIndex + tick-aware scheduling)

- [ ] T010 GATE: Precompute depsIndex during trait build in `packages/logix-core/src/internal/state-trait/build.ts` (must be `O(totalDeps)` at build time; no per-commit scan)
- [ ] T011 GATE: Implement `SourceAutoTrigger` runtime kernel consuming `dirtyPaths` and scheduling refresh (tick-aware) in `packages/logix-core/src/internal/runtime/core/SourceAutoTrigger.ts`
- [ ] T012 [P] Add semantics tests: deps change triggers refresh; manual-only disables; debounce coalesces; diagnostics gating in `packages/logix-core/test/internal/runtime/SourceAutoTrigger.*.test.ts`

## Phase 3: Migrations（消灭胶水）

- [ ] T020 GATE: Migrate `@logixjs/query` to rely on kernel auto-trigger; remove `packages/logix-query/src/internal/logics/auto-trigger.ts` usage; update `packages/logix-query/src/Traits.ts` lowering
- [ ] T021 [P] Migrate `@logixjs/form` to rely on kernel auto-trigger; remove dependence on `TraitLifecycle.makeSourceWiring`
- [ ] T022 [P] Add regression tests in `packages/logix-query/test/*` covering debounce + cache-peek skip-loading under kernel triggering

## Phase 4: Evidence & Gates

- [ ] T030 Collect perf evidence (before/after) per `plan.md#Perf Evidence Plan` (must show no per-commit linear scan regression)
- [ ] T031 Run workspace gates (typecheck/lint/test)
- [ ] T032 Ensure migration notes are accurate in `specs/076-logix-source-auto-trigger-kernel/contracts/migration.md` (forward-only; no shim)

