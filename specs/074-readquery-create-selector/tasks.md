# Tasks: ReadQuery.createSelector（reselect 风格组合器）

**Input**: `specs/074-readquery-create-selector/*`

## Phase 1: Docs / Contracts

- [x] T001 Write `spec.md` / `plan.md`
- [x] T002 Write `research.md` / `data-model.md` / `quickstart.md`
- [x] T003 Write `contracts/*`（public-api/semantics/migration）

## Phase 2: Implementation（@logixjs/core）

- [ ] T010 Implement `ReadQuery.createSelector` in `packages/logix-core/src/internal/runtime/core/ReadQuery.ts` (per `contracts/semantics.md`)
- [ ] T011 Export `createSelector` from `packages/logix-core/src/ReadQuery.ts`

## Phase 3: Tests

- [ ] T020 Add `packages/logix-core/test/ReadQuery/ReadQuery.createSelector.test.ts`:
  - static union(reads) + readsDigest exists
  - fail-fast on dynamic input (fallbackReason surfaced)
  - selectorId determinism (same inputs+debugKey+params → stable id)
- [ ] T021 Ensure existing tests stay green: `packages/logix-core/test/ReadQuery/ReadQuery.compile.test.ts`, `packages/logix-core/test/ReadQuery/ReadQuery.strictGate.test.ts`, `packages/logix-core/test/SelectorGraph.test.ts`
  - Note: SelectorGraph tests live at `packages/logix-core/test/Runtime/ModuleRuntime/SelectorGraph.test.ts`

## Phase 4: Quality Gates

- [ ] T030 Run `pnpm typecheck`（workspace）
- [ ] T031 Run `pnpm lint`（workspace）
- [ ] T032 Run `pnpm test:turbo`（workspace）
