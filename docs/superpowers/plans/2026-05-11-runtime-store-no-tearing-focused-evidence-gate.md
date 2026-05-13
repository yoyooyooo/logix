# RuntimeStore No-Tearing Focused Evidence Gate Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a hard-evidence route for the RuntimeStore / selector notify wave after structural sentinels pass.

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

- Create: `specs/219-runtime-store-no-tearing-focused-evidence-gate/perf/README.md`
- Create: `docs/next/runtime-store-selector-notify-before-after-playbook.md`

### Modify

- Modify: `packages/logix-react/test/browser/perf-boundaries/runtime-store-no-tearing.test.tsx`
- Modify: `packages/logix-react/test/browser/perf-boundaries/negative-dirty-pattern.test.tsx`
- Modify: `packages/logix-react/test/browser/perf-boundaries/selector-render-fanout.test.tsx`

### Focused Tests

- `pnpm perf collect -- --profile default --files test/browser/perf-boundaries/runtime-store-no-tearing.test.tsx --out specs/219-runtime-store-no-tearing-focused-evidence-gate/perf/before.runtimeStore.<sha>.<envId>.default.json`
- `pnpm perf diff -- --before <before> --after <after> --out specs/219-runtime-store-no-tearing-focused-evidence-gate/perf/diff.runtimeStore.before__after.<envId>.default.json`

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
