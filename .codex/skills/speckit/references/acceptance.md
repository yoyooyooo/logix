---
description: Perform a post-implementation acceptance review by validating every coded point in spec.md against the current codebase.
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Goal

Run a “God View” acceptance pass **after implementation**: verify every coded point in `spec.md` (e.g., `FR-xxx`, `NFR-xxx`, `SC-xxx`) against the latest source code, and surface drift, conflicts, and missing coverage.

## Operating Constraints

- **Default to READ-ONLY**: do **not** modify any files unless the user explicitly asks.
- **Parallel Work Safety (Non-Negotiable)**: Assume the working tree may contain unrelated, uncommitted changes from other parallel tasks.
  - ABSOLUTELY PROHIBITED: any form of `git restore`, `git checkout -- <path>`, `git reset`, `git clean`, `git stash`.
  - Avoid staging/committing/history rewriting unless explicitly requested by the user: `git add`, `git commit`, `git rebase`, `git merge`, `git cherry-pick`, `git push`.
  - Read-only git commands are allowed (e.g., `git status`, `git diff`).
- **Evidence-driven**: Do not mark an item as PASS without pointing to concrete evidence (file paths / symbols / tests / commands).
- **Non-resident commands**: If unsure a command terminates, use `timeout 30s <command>` (or an equivalent one-shot invocation).

## Execution Steps

### 1) Initialize Context

This stage supports validating **one or multiple** specs in a single run.

**Target specs (multi-spec mode):**

- If `$ARGUMENTS` contains one or more feature ids (e.g. `026`, `026-my-feature`, `027`), treat them as targets.
- If `SPECIFY_FEATURE` is already set (e.g. when using `$speckit acceptance 026 027`), include it as a target as well.
- Target ordering (important): if both `SPECIFY_FEATURE` and `$ARGUMENTS` are present, treat `SPECIFY_FEATURE` as the **first** target, then append `$ARGUMENTS` tokens in order.
- De-duplicate targets; keep the resulting order.
- **Spec Group shorthand**: if a target feature is a “Spec Group” (its feature directory contains `spec-registry.json` or `spec-registry.md`), expand it into member specs (in registry order) by running:  
  `SKILL_DIR/scripts/bash/spec-group-members.sh <group> --json`  
  Then append its `members` immediately after the group target (de-duplicate). This allows “只输入总控编号”也能跑 multi-spec acceptance。
- If no targets are provided, fall back to the inferred “current” feature (single-spec mode).

From repo root, set `REPO_ROOT="$(pwd)"` so you can form absolute paths consistently.

For **each** target feature, run:

`SKILL_DIR/scripts/bash/check-prerequisites.sh --json --require-tasks --include-tasks --feature <id>`

Parse JSON for `FEATURE_DIR` and `AVAILABLE_DOCS`. All paths must be absolute.

Derive absolute paths:

- `SPEC = FEATURE_DIR/spec.md`
- `PLAN = FEATURE_DIR/plan.md`
- `TASKS = FEATURE_DIR/tasks.md`
- `CONSTITUTION = REPO_ROOT/.specify/memory/constitution.md`

Abort with a clear error if any required file is missing (and instruct which prerequisite command to run).
For single quotes in args like "I'm Groot", use escape syntax: e.g. `I'\''m Groot` (or double-quote if possible: `"I'm Groot"`).

### 2) Optional Checklist Gate

For each `FEATURE_DIR`, if `FEATURE_DIR/checklists/` exists:

- Scan all checklist files in `checklists/`.
- For each checklist, count:
  - Total items: lines matching `- [ ]` or `- [X]` or `- [x]`
  - Completed items: lines matching `- [X]` or `- [x]`
  - Incomplete items: lines matching `- [ ]`
- If any checklist is incomplete: **STOP** and ask whether to continue acceptance anyway.

### 3) Load Artifacts (Progressive Disclosure)

- **REQUIRED (per spec)**: `spec.md`, `plan.md`, `tasks.md`
- **REQUIRED**: `.specify/memory/constitution.md` (for MUST/SHOULD validation)
- **IF EXISTS (per spec)**: `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

From `spec.md`, load the minimum needed to extract and interpret coded points:

- Functional Requirements
- Non-Functional Requirements
- Success Criteria
- User Stories (only as supporting context)

### 4) Build Coded Points Inventory (SSoT = spec.md)

Prefer a deterministic, script-backed inventory over ad-hoc grep.

**MUST** run `SKILL_DIR/scripts/bash/extract-coded-points.sh --json` once for all targets (repeat `--feature`):

`SKILL_DIR/scripts/bash/extract-coded-points.sh --json --feature 024 --feature 025`

Use the script output as the source-of-truth inventory:

- `points`: the canonical coded points list (**definitions** only; one row per code)
- `occurrences`: all mentions (includes cross-references like “见 FR-004”)
- `duplicateDefinitions`: same code defined multiple times (treat as DRIFT/HIGH)
- `orphanReferences`: code referenced but never defined (treat as FAIL/HIGH)

Only fall back to manual search if the script fails or the spec format is non-standard.

### 5) Determine Implementation Footprint

Prefer a deterministic, script-backed inventory over ad-hoc parsing.

**MUST** run `SKILL_DIR/scripts/bash/extract-tasks.sh --json` once for all targets (repeat `--feature`):

`SKILL_DIR/scripts/bash/extract-tasks.sh --json --feature 024 --feature 025`

Use the script output as the source-of-truth task inventory:

- `tasks`: task list with `done` status + phase/story/[P] + `refs` (if tasks lines contain `Refs:`)
- `counts` / `byPhase` / `byStory`
- `duplicates`: duplicate task ids (treat as DRIFT/HIGH)

Optionally (read-only), if the repo is a git repo:

- Use `git diff --name-only` (and/or `git status`) to list changed files
- Classify each changed file as “in-scope” (mentioned in tasks/plan) vs “out-of-scope” (potential drift / parallel work)

Do **not** assume the diff equals the feature; treat tasks/plan as the feature boundary and flag mismatches.

### 6) Evidence Gathering Per Coded Point

For **each** coded point (e.g., `FR-001`), collect (per spec):

- **Implementation evidence**: file paths + key symbols or config knobs that implement it
- **Verification evidence**: tests (unit/integration/contract), quickstart steps, checklist items, or reproducible commands
- **Task linkage**: which task IDs implement/validate it (prefer explicit references; otherwise infer by text + file path overlap)
- **Drift check**:
  - If code contradicts `spec.md` or `plan.md` → mark **DRIFT**
  - If code conflicts with constitution MUSTs → mark **DRIFT (CRITICAL)**

If you cannot prove PASS, mark **PARTIAL/UNKNOWN** and explain what evidence is missing.

### 7) Produce Acceptance Matrix (Compact, Exhaustive Over Codes)

Output acceptance matrices covering **every** coded point in **each** spec.

Important: In multi-spec mode, codes like `FR-001` are **not globally unique**. Always include the feature id (or spec directory) in the matrix key.

Recommended format:

| Feature | Code | Type | Status | Evidence | Verification | Task IDs | Notes / Drift |
| ------- | ---- | ---- | ------ | -------- | ------------ | -------- | ------------- |

Status must be one of:

- **PASS**: implemented + verified
- **PARTIAL**: implemented but missing verification / measurable criteria
- **FAIL**: not implemented
- **DRIFT**: implemented but contradicts spec/plan/constitution
- **UNKNOWN**: insufficient evidence to decide

### 8) Cross-Cutting Checks

- **Plan alignment**: major architecture choices, dependencies, and project structure still match the codebase.
- **NFR coverage**: performance budgets/baselines and diagnosability requirements are reflected in code/tests/docs.
- **Constitution alignment**: only flag what’s actually applicable, but treat MUST violations as CRITICAL.
- **Cross-spec conflicts (multi-spec mode)**: highlight any contradictory requirements/plans, shared-file contention, or API/contract drift between the target specs.

### 9) Quality Gates (One-Shot)

- Prefer explicit “quality gates” commands written in `plan.md`.
- If missing, infer the minimal one-shot checks from repo conventions (e.g., `typecheck` / `lint` / `test`) and run them once (avoid watch mode).
- Record PASS/FAIL and a short blocker summary (no walls of logs).

### 10) Next Actions

Provide a prioritized list:

- CRITICAL drift to resolve first
- Missing coded points
- Missing verification (tests/bench/diagnostics)

Ask the user:

“Do you want me to turn the top N gaps into concrete follow-up tasks (and where should they live: append to `tasks.md` vs a separate follow-up file)?”

## Context

$ARGUMENTS
