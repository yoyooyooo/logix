# Kernel Performance Evidence Lock Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a deterministic local evidence lock that classifies kernel hot-path evidence without changing runtime semantics or claiming performance improvement.

**Architecture:** The patch adds a pure classifier/report script in `packages/logix-perf-evidence/scripts`, a focused Vitest contract test, and speckit/handoff docs. It reads an existing local manifest and produces JSON/Markdown classification. It does not collect benchmarks and does not touch public API or runtime behavior.

**Tech Stack:** TypeScript 5.x, Vitest, Node.js fs/process, pnpm monorepo, existing Logix perf-evidence package conventions.

---

## File Structure

### Create

- `packages/logix-perf-evidence/scripts/ci.kernel-performance-evidence-lock.ts` — deterministic classifier and CLI.
- `packages/logix-perf-evidence/scripts/ci.kernel-performance-evidence-lock.test.ts` — focused contract tests.
- `docs/next/kernel-performance-evidence-lock.md` — current evidence-lock rule and claim policy.
- `specs/230-kernel-performance-evidence-lock/spec.md` — requirements and acceptance criteria.
- `specs/230-kernel-performance-evidence-lock/plan.md` — implementation plan.
- `specs/230-kernel-performance-evidence-lock/tasks.md` — task checklist.
- `specs/230-kernel-performance-evidence-lock/handoff.md` — local execution report template.
- `specs/230-kernel-performance-evidence-lock/quickstart.md` — apply/verify/classify commands.
- `specs/230-kernel-performance-evidence-lock/checklists/requirements.md` — requirements quality checklist.
- `specs/230-kernel-performance-evidence-lock/perf/README.md` — local evidence artifact location.

### Modify

- None in this patch. This first delivery is an additive evidence lock. Future follow-up may wire package scripts after local maintainer review.

## Global Guardrails

- Do not add public root exports, public submodules, public selector nouns, or public fast-path config.
- Do not change runtime behavior.
- Do not run or claim benchmarks from cloud-generated evidence.
- Do not classify quick/smoke evidence as hard success.
- Do not treat missing counters/suites as pass.
- Do not use destructive git operations: `git reset`, `git clean`, `git checkout -- <path>`, `git restore`, `git stash`.

## Chunk 1: Apply additive evidence-lock patch

### Task 1: Preflight

- [ ] Run `git status --short`.
- [ ] Run `git rev-parse HEAD`.
- [ ] Confirm no packed XML/Repomix file will be edited.
- [ ] Record unrelated dirty worktree entries in `specs/230-kernel-performance-evidence-lock/handoff.md` before applying.

### Task 2: Apply patch

- [ ] Run:

```bash
git apply --check patches/0001-kernel-performance-evidence-lock.patch
git apply patches/0001-kernel-performance-evidence-lock.patch
```

Expected: both commands pass from repo root.

## Chunk 2: Focused contract validation

### Task 3: Run classifier tests

- [ ] Run:

```bash
pnpm -C packages/logix-perf-evidence test scripts/ci.kernel-performance-evidence-lock.test.ts
```

Expected: PASS.

### Task 4: Run adjacent evidence-script tests

- [ ] Run:

```bash
pnpm -C packages/logix-perf-evidence test scripts/ci.selector-notify-tax-report.test.ts scripts/ci.field-kernel-dirty-work-tax-report.test.ts
```

Expected: PASS, unless unrelated pre-existing package failure is recorded separately.

## Chunk 3: Local evidence manifest and report

### Task 5: Produce local manifest

- [ ] Collect or assemble local default/soak evidence manifest at:

```text
specs/230-kernel-performance-evidence-lock/perf/manifest.<sha>.<env>.default.json
```

- [ ] Manifest must include all required suite statuses and watched fallback counters.

### Task 6: Classify manifest

- [ ] Run:

```bash
pnpm exec tsx packages/logix-perf-evidence/scripts/ci.kernel-performance-evidence-lock.ts \
  --manifest specs/230-kernel-performance-evidence-lock/perf/manifest.<sha>.<env>.default.json \
  --out specs/230-kernel-performance-evidence-lock/perf/report.<sha>.<env>.default.md \
  --json-out specs/230-kernel-performance-evidence-lock/perf/report.<sha>.<env>.default.json
```

Expected for hard lock: `classification=locked`, `claimStrength=hard`.

## Chunk 4: Report and handoff closure

### Task 7: Update handoff

- [ ] Fill commands run, pass/fail status, evidence artifacts, blockers, and allowed/forbidden claims.
- [ ] If profile is quick/smoke, mark result `provisional` and do not claim hard performance success.
- [ ] If any fallback counter is non-zero, mark result `blocked` and choose next source fix.

### Task 8: Diff check

- [ ] Run:

```bash
git diff --check -- \
  packages/logix-perf-evidence/scripts/ci.kernel-performance-evidence-lock.ts \
  packages/logix-perf-evidence/scripts/ci.kernel-performance-evidence-lock.test.ts \
  docs/next/kernel-performance-evidence-lock.md \
  specs/230-kernel-performance-evidence-lock
```

Expected: PASS.
