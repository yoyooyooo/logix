# RuntimeStore Listener Snapshot and Callback Fast Path Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce notify overhead without sacrificing no-tearing, stable order, or in-tick subscription mutation isolation.

**Architecture:** This spec isolates one part of the RuntimeStore selector notify wave. It adds structural sentinels first, then minimal implementation, then focused validation. Public API, selector route ownership, transaction semantics, and no-tearing must remain stable.

**Tech Stack:** TypeScript 5.x, Effect, Vitest, pnpm monorepo, Logix core/react perf-boundary harness.

---

## Global Guardrails

- Do not add public root exports, public submodules, public selector nouns, or public fast-path config.
- Do not move selector route policy into React.
- Do not replace exact selector routing with broad module broadcast.
- Do not weaken no-tearing, listener mutation isolation, or lifecycle cleanup tests.
- Do not claim performance success from quick, dirty, unstable, or non-comparable evidence.
- Do not allocate diagnostics/debug payloads on `diagnostics=off` exact fast paths.
- Do not use destructive git operations: `git reset`, `git clean`, `git checkout -- <path>`, `git restore`, `git stash`.
- Commit after each focused task group passes when working in a real repo.

## File Structure / Responsibility Map

### Create

- Create: `packages/logix-core/test/internal/Runtime/RuntimeStore.notifyFastPath.contract.test.ts`

### Modify

- Modify: `packages/logix-core/src/internal/runtime/core/RuntimeStore.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/TickScheduler.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/JobQueue.ts`

### Focused Tests

- `pnpm -C packages/logix-core test test/internal/Runtime/RuntimeStore.listenerSnapshot.test.ts`
- `pnpm -C packages/logix-core test test/internal/Runtime/RuntimeStore.notifyFastPath.contract.test.ts`
- `pnpm -C packages/logix-core test test/internal/Runtime/TickScheduler.topic-classification.test.ts`

## Chunk 1: Preflight and Failing Guard

### Task 1: Record current owner path

- [ ] Run `git status --short` and `git rev-parse HEAD`.
- [ ] Inspect all target files listed above.
- [ ] Update `handoff.md` with existing unrelated changes.
- [ ] Confirm no packed source/XML file will be edited.

### Task 2: Add or confirm failing sentinel

**Files:**
- Test/Create or Modify: listed target test file(s)
- Source Inspect: listed target source file(s)

- [ ] Write the smallest focused test/sentinel for this spec's first tax point.
- [ ] Run the focused test.
- [ ] Expected before implementation: FAIL if the gap exists; PASS only if current repo already satisfies the sentinel.
- [ ] If PASS already, record as existing protection and move to the next acceptance criterion.

## Chunk 2: Minimal Implementation

### Task 3: Implement narrow owner change

- [ ] Modify only the listed owner file(s).
- [ ] Keep exact fast path branch-shaped; do not add global sweeps or public config.
- [ ] Keep fallback paths explicit and reason-coded.
- [ ] Keep counters test-only or diagnostics-gated.

### Task 4: Validate focused behavior

- [ ] Run the focused test(s) listed above.
- [ ] Expected after implementation: PASS.
- [ ] Run adjacent existing tests that protect no-tearing / selector route / public surface.
- [ ] If unrelated tests fail, record the failure and do not broaden scope.

## Chunk 3: Evidence and Handoff

### Task 5: Update handoff

- [ ] List files changed.
- [ ] List commands run and exact outcomes.
- [ ] Record structural sentinel status.
- [ ] Record any migrated_cost / migrated_risk.
- [ ] State allowed and forbidden claims.

### Task 6: Commit recommendation

Suggested commit style:

```bash
git add <changed files>
git commit -m "perf(runtime): bound selector notify fanout"
```

Use a more specific message matching the spec if only part of the path changed.
