---
description: Digest an external review question list (no review.md) and update plan.md (and tasks.md/spec.md if needed) to close the loop.
handoffs:
  - label: Refresh Tasks
    agent: speckit.tasks
    prompt: Update tasks based on the updated plan.md.
    send: true
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding. This stage expects a *question list* pasted inline (no `review.md`).

## Parallel Development Safety (Non-Negotiable)

- Assume the working tree may contain unrelated, uncommitted changes from other parallel tasks.
- NEVER try to "leave only this task's files" by reverting or cleaning other changes.
- ABSOLUTELY PROHIBITED: any form of `git restore`, `git checkout -- <path>`, `git reset`, `git clean`, `git stash`.
- Avoid staging/committing/history rewriting unless explicitly requested by the user: `git add`, `git commit`, `git rebase`, `git merge`, `git cherry-pick`, `git push`.
- Read-only git commands are allowed (e.g., `git status`, `git diff`).

## Outline

Goal: Take an external reviewer’s *questions* (asked from the “questioner” perspective) and merge the resulting decisions back into the feature artifacts so the spec-kit SSoT stays consistent.

- Primary target: `plan.md`
- Secondary targets (only when required by the questions/answers): `tasks.md`, `spec.md`, `data-model.md`, `contracts/*`

## Execution Steps

### 1) Resolve feature + file paths

1. Run `SKILL_DIR/scripts/bash/setup-plan.sh --json` from repo root **once** and parse JSON:
   - `FEATURE_SPEC` (spec.md path)
   - `IMPL_PLAN` (plan.md path)
2. Derive `FEATURE_DIR = dirname(FEATURE_SPEC)`.
3. Determine candidate optional files (only load when needed):
   - `TASKS_FILE = FEATURE_DIR/tasks.md`
   - `DATA_MODEL = FEATURE_DIR/data-model.md`
   - `RESEARCH = FEATURE_DIR/research.md`
   - `CONTRACTS_DIR = FEATURE_DIR/contracts/`

If `IMPL_PLAN` does not exist, stop and instruct the user to run `$speckit plan <feature>` first.

### 2) Validate question input (no review.md in this flow)

- If `$ARGUMENTS` is empty:
  - Stop and ask the user to paste the question list (preferred format: one question per line; IDs like `Q001` are optional).
- Otherwise:
  - Normalize the questions into an internal list:
    - If IDs are present, keep them (`Q001`, `Q002`, ...).
    - If not, assign stable IDs in appearance order.

### 3) Load context

Read:
- `FEATURE_SPEC`
- `IMPL_PLAN`
- `.specify/memory/constitution.md`

If present and relevant to specific questions, also read:
- `TASKS_FILE`
- `DATA_MODEL`
- `RESEARCH`
- `CONTRACTS_DIR/*` (only the files actually referenced by questions or by planned changes)

### 4) Answer questions → merge decisions into artifacts (do not append-only)

For each question:

1. Produce a direct answer (concise, decision-oriented).
2. Decide which artifact(s) the answer impacts:
   - Spec ambiguity / missing acceptance criteria → update `spec.md`
   - Architecture / constraints / quality gates / performance & diagnostics plan → update `plan.md`
   - Implied work items / sequencing / validation steps → update `tasks.md` (if it exists)
   - Data / contracts correctness → update `data-model.md` / `contracts/*`
3. Apply edits by **merging into the correct section(s)** (replace/adjust contradictory text; avoid duplicating near-identical bullets).

If a question cannot be answered without product/business choice, do **NOT** guess:
- Ask the user for a decision (offer 2–5 options).
- After the user decides, continue and encode the answer back into the artifacts.

### 5) Record a compact “Questions Digest” in plan.md

In `plan.md`, add a small note near the top (or under `## Summary`) that:
- States the source as “external questions pasted into `$speckit plan-from-questions`”.
- Lists the key accepted changes, referencing question IDs (e.g., `Q003`, `Q007`).
- If you changed `spec.md` or `tasks.md`, include a 1-line pointer to those updates.

Keep it compact (a digest, not a transcript).

### 6) Tasks handling (keep tasks.md as the task list)

- If `tasks.md` exists:
  - Add/adjust tasks to reflect accepted changes.
  - Ensure tasks have concrete file paths and validation steps.
- If `tasks.md` does not exist:
  - Do **NOT** invent a full tasks list here.
  - Recommend running `$speckit tasks <feature>` after `plan.md` is updated.

### 7) Final validation

- No contradictory statements left in `spec.md`/`plan.md`.
- “Questions Digest” exists and references the right IDs.
- Any new perf/diagnostics gates mentioned are actionable (what to measure, where, how to validate).

## Report

In your final response, include:
- Which files were updated.
- The recommended next command(s): typically `$speckit tasks <feature-id>` (if tasks are missing/outdated), or proceed to `$speckit implement <feature-id>`.
