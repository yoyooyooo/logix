# Effect v4 Master Track Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete the remaining `specs/103-effect-v4-forward-cutover` master-track work so the repo genuinely runs on Effect v4 beta instead of `effect@3.x` + `@effect/*@0.x`.

**Architecture:** Migrate in dependency order: unify the workspace to a single real v4 beta version first, then fix the shared testing/runtime boundaries that fan out across packages, then upgrade downstream library packages, and only after that finish apps/examples/docs/SSoT. Keep the repo `v4-only + forward-only`; no compatibility layer, no dual stack, no fake “done” gates.

**Tech Stack:** pnpm workspace, TypeScript 5.x, Effect v4 beta (`4.0.0-beta.28`), Vitest, tsup, React 19, Node entrypoints using platform/sql/workflow packages.

---

### Task 1: Lock the Effect v4 beta version matrix

**Files:**
- Modify: `package.json`
- Modify: `packages/logix-core/package.json`
- Modify: `packages/logix-react/package.json`
- Modify: `packages/logix-sandbox/package.json`
- Modify: `packages/logix-devtools-react/package.json`
- Modify: `packages/logix-form/package.json`
- Modify: `packages/logix-query/package.json`
- Modify: `packages/domain/package.json`
- Modify: `packages/i18n/package.json`
- Modify: `packages/logix-test/package.json`
- Modify: `packages/logix-core-ng/package.json`
- Modify: `packages/logix-cli/package.json`
- Modify: `packages/speckit-kit/package.json`
- Modify: `apps/logix-galaxy-api/package.json`
- Modify: `apps/logix-galaxy-fe/package.json`
- Modify: `apps/speckit-kanban-api/package.json`
- Modify: `apps/studio-fe/package.json`
- Modify: `examples/effect-api/package.json`
- Modify: `examples/logix-cli-playground/package.json`
- Modify: `examples/logix-form-poc/package.json`
- Modify: `examples/logix-react/package.json`
- Modify: `examples/logix-sandbox-mvp/package.json`

**Step 1: Freeze the Stage 1 inventory before edits**

- Run the existing `G1.0`-style read-only inventory first so the dependency matrix baseline is explicit before any manifest change.

Run:
- `pnpm -r why effect`
- `pnpm -r why @effect/platform`

**Step 2: Write a failing matrix test/check**

- Add or extend a repo check that asserts no workspace manifest still pins `effect@3.x` or `@effect/*@0.x` where v4 beta must be unified.

**Step 3: Run the check to confirm RED**

Run the new matrix gate by itself, then confirm the repo still contains v3/0.x pins with:

- `rg -n '"effect": "\^?3\.|"effect": "3\.|"@effect/.+": "0\.' --glob 'package.json'`

**Step 4: Update manifests to one exact beta**

- Use `4.0.0-beta.28` consistently for `effect`, `@effect/platform-node`, `@effect/vitest`, and every still-separate Effect ecosystem package.
- Remove root override drift and replace it with one unified v4 beta matrix.

**Step 5: Install and capture the first breakage set**

Run: `pnpm install`

**Step 6: Record exact first-order failures**

- Keep the install/typecheck output as the new Stage 1 baseline for follow-up fixes.

### Task 2: Repair the shared test/runtime boundary after the v4 bump

**Files:**
- Modify: `packages/logix-test/src/internal/runtime/runTest.ts`
- Modify: `packages/logix-test/src/internal/api/vitest.ts`
- Modify: `packages/logix-core/src/Runtime.ts`
- Modify: `packages/logix-core/src/ExternalStore.ts`
- Modify: `packages/logix-react/src/internal/store/ModuleCache.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/runner/ProgramRunner.closeScope.ts`
- Test: representative files under `packages/logix-core/test/**`, `packages/logix-form/test/**`, `packages/logix-query/test/**`

**Step 1: Add a minimal failing regression per broken shared boundary**

- For any changed shared runtime/test helper, write or update a focused regression test before code changes.

**Step 2: Make v4 replacements at the shared boundary**

- Migrate removed/renamed APIs (`catch*`, `fork*`, `Scope.extend`, `Runtime<R>`, `FiberRef`/`Context.Reference` assumptions, `Yieldable` changes).
- Fix the custom `@effect/vitest` harness before touching dozens of downstream tests.

**Step 3: Verify shared packages**

Run:
- `pnpm -C packages/logix-test typecheck`
- `pnpm -C packages/logix-core typecheck:test`
- `pnpm -C packages/logix-core test`
- `pnpm -C packages/logix-react typecheck:test`

### Task 3: Execute Stage 3 STM insertion and gates after shared runtime stabilizes

**Files:**
- Modify: `specs/103-effect-v4-forward-cutover/inventory/gate-c.md`
- Modify: `specs/103-effect-v4-forward-cutover/inventory/gate-g2.md`
- Modify: runtime/state files implicated by the STM/local adoption track, starting from the current `docs/effect-v4/05-stm-local-adoption.md` and `specs/103-effect-v4-forward-cutover/research.md` scope

**Step 1: Add or refresh the gating tests for Stage 3 points**

- Keep STM changes constrained to the documented allowed areas.

**Step 2: Run Gate-C / G2 evidence before expanding to downstream packages**

- Do not skip this stage; `103` still keeps Stage 3 between the core migration and broad package rollout.

### Task 4: Migrate downstream library packages in dependency order

**Files:**
- Modify: `packages/logix-core-ng/**`
- Modify: `packages/logix-form/**`
- Modify: `packages/logix-query/**`
- Modify: `packages/domain/**`
- Modify: `packages/i18n/**`
- Modify: `packages/logix-devtools-react/**`
- Modify: `packages/logix-sandbox/**`

**Step 1: Triage by package risk**

- Do core-ng / form / query / domain / i18n first.
- Do devtools-react / sandbox after shared runtime/test surfaces stabilize.

**Step 2: For each package, do strict RED → GREEN**

- Add or tighten the package-local failing test/check.
- Migrate code.
- Run package-local typecheck + tests before moving on.

**Step 3: Clear schema legacy syntax**

- Remove remaining `Schema.partial(...)`, `Schema.Record({ key, value })`, `Schema.pattern(...)`, and other blocked syntax.

### Task 5: Migrate Node/API packages and apps/examples

**Files:**
- Modify: `packages/logix-cli/**`
- Modify: `packages/speckit-kit/**`
- Modify: `apps/logix-galaxy-api/**`
- Modify: `apps/logix-galaxy-fe/**`
- Modify: `apps/speckit-kanban-api/**`
- Modify: `apps/studio-fe/**`
- Modify: `examples/effect-api/**`
- Modify: `examples/logix-cli-playground/**`
- Modify: `examples/logix-form-poc/**`
- Modify: `examples/logix-react/**`
- Modify: `examples/logix-sandbox-mvp/**`
- Modify: `examples/logix/**`

**Step 1: Fix package consolidation/import moves**

- Update imports that move from old split packages to `effect` / `effect/unstable/*` or matching v4 platform packages.

**Step 2: Verify entrypoints**

Run package/app-local typecheck and tests immediately after each migration cluster.

**Step 3: Re-run smoke examples**

- Use the existing app/example tests and any non-watch smoke scripts that are already in repo.

### Task 6: Clean docs, SSoT, and migration records

**Files:**
- Modify: `apps/docs/content/docs/**`
- Modify: `docs/effect-v4/**`
- Modify: `docs/ssot/**`
- Modify: `AGENTS.md`
- Modify: `CLAUDE.md`
- Modify: `GEMINI.md`
- Modify: `specs/103-effect-v4-forward-cutover/**`

**Step 1: Remove v3 mental model drift**

- Rewrite docs that still teach `ManagedRuntime.make`, `Effect.runPromise`, `Effect v3 patterns`, or `@effect/schema` as the canonical story where that is no longer true under v4.

**Step 2: Keep the 103 spec honest**

- Update stage records and progress only after code/tests/build prove the new state.

### Task 7: Full verification and gate update

**Files:**
- Verify only; update `specs/103-effect-v4-forward-cutover/*` with evidence paths as needed

**Step 1: Run full repo verification**

Run:
- `pnpm typecheck`
- `pnpm typecheck:test`
- `pnpm lint`
- `pnpm test:turbo`
- `pnpm build:pkg`

**Step 2: Run migration-specific audits**

Run:
- `pnpm check:schema-v4-legacy`
- `rg -n "Context\.GenericTag|Effect\.locally\b|Runtime\.run(?:Sync|Fork|Promise|Callback)|FiberRef\.|Schema\.partial\(|Schema\.pattern\(|Schema\.Record\(\{\s*key:"`
- `rg -n '"effect": "\^?3\.|"effect": "3\.|"@effect/.+": "0\.' --glob 'package.json'`

**Step 3: Only then update 103 progress/gates**

- Do not mark the master track done unless manifests, code, docs, tests, and build all match v4 reality.
