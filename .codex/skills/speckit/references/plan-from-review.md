---
description: Digest an external review report (review.md) and update plan.md (and tasks.md/spec.md if needed) to close the loop.
handoffs:
  - label: Refresh Tasks
    agent: speckit.tasks
    prompt: Update tasks based on the updated plan.md and review.md.
    send: true
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Parallel Development Safety (Non-Negotiable)

- Assume the working tree may contain unrelated, uncommitted changes from other parallel tasks.
- NEVER try to "leave only this task's files" by reverting or cleaning other changes.
- ABSOLUTELY PROHIBITED: any form of `git restore`, `git checkout -- <path>`, `git reset`, `git clean`, `git stash`.
- Avoid staging/committing/history rewriting unless explicitly requested by the user: `git add`, `git commit`, `git rebase`, `git merge`, `git cherry-pick`, `git push`.
- Read-only git commands are allowed (e.g., `git status`, `git diff`).
- Do **NOT** delete `review.md`. Preserve it as evidence (you may add a small status note if needed).

## Outline

Goal: Take a review report (typically created by another LLM) and merge the actionable decisions back into the feature artifacts so the spec-kit SSoT stays consistent:

- Primary target: `plan.md`
- Secondary targets (only when required by the review): `tasks.md`, `spec.md`, `data-model.md`, `contracts/*`

Execution steps:

1. **Resolve feature + file paths**
   - Run `SKILL_DIR/scripts/bash/setup-plan.sh --json` from repo root **once** and parse JSON:
     - `FEATURE_SPEC` (spec.md path)
     - `IMPL_PLAN` (plan.md path)
   - Derive `FEATURE_DIR = dirname(FEATURE_SPEC)`.
   - Determine candidate inputs:
     - `REVIEW_FILE = FEATURE_DIR/review.md` (default)
     - `TASKS_FILE = FEATURE_DIR/tasks.md` (optional)
     - `DATA_MODEL = FEATURE_DIR/data-model.md` (optional)
   - If `REVIEW_FILE` does not exist:
     - Ask the user to provide the review content (paste) or to create `review.md` first, then stop.

2. **Load context**
   - Read:
     - `FEATURE_SPEC`
     - `IMPL_PLAN`
     - `REVIEW_FILE`
     - `.specify/memory/constitution.md`
   - If present and relevant to review items, also load:
     - `TASKS_FILE`
     - `DATA_MODEL`
     - `FEATURE_DIR/research.md`
     - `FEATURE_DIR/contracts/*` (only the files mentioned by review)

3. **Digest the review (item-by-item)**
   - Highest priority: **Risks & Recommendations**
     - For each risk: ensure `plan.md` includes a concrete mitigation plan (what to do, where, how to validate).
     - If mitigation implies work: add/update concrete tasks in `tasks.md` (or flag that tasks are missing).
   - Then: **Technical Analysis** and **Constitution Check / Quality Gates**
     - If the review points out a violation or missing gate: either (a) change the plan to comply, or (b) explicitly justify the violation in `plan.md` (Complexity Tracking).
     - If the review mentions performance/diagnostics, ensure the plan includes a reproducible baseline/measurement and the intended diagnostic surfaces/cost.
   - Clarifications:
     - If review identifies ambiguous requirements or missing edge cases, update `spec.md` (and keep `FR-/NFR-/SC-` points consistent).
   - Data/contract correctness:
     - If the review points out missing/incorrect domain modeling, update `data-model.md`.
     - If the review changes external contracts, update `contracts/*` and ensure the plan/tasks reflect the change.

4. **Apply edits (merge into the right sections, not append-only)**
   - `plan.md`:
     - Edit the relevant sections (Summary / Technical Context / Constitution Check / Project Structure / Complexity Tracking).
     - Add a small “Review Digest” note near the top (or under Summary) containing:
       - The review source file (`review.md`)
       - A concise list of the key accepted changes (prefer referencing review item IDs like `R001`, `R101`, ...)
   - `tasks.md` (if it exists):
     - Add new tasks or adjust existing tasks to reflect accepted review changes.
     - Ensure tasks have concrete file paths and validation steps.
   - If `tasks.md` does not exist:
     - Do **NOT** invent a full tasks list here.
     - Mention that `$speckit tasks` should be run next after the plan is updated.

5. **Close the loop (without deleting evidence)**
   - Keep `review.md` in place.
   - If `review.md` contains a `**Digest**: PENDING` line, update it to something like `**Digest**: DONE (YYYY-MM-DD)`; otherwise optionally add a short status line at the top of `review.md` (e.g., “Digested into plan.md/tasks.md on YYYY-MM-DD”).
   - Output a brief summary: which files changed and what major review points were accepted/rejected (with 1-line rationale for rejections).
