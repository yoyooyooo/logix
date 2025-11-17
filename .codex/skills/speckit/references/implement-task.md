---
description: Execute a small, explicitly selected set of tasks from tasks.md using a task-driven, minimal-context workflow (does NOT change $speckit implement behavior).
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

## Goal

Implement **only** the requested task(s) (or the next incomplete task by default), while keeping context loading minimal:

- Read `tasks.md` once.
- Do NOT bulk-load optional design artifacts up-front.
- Load additional docs/files **only when the selected task requires them**.

## Accepted Task Selectors (from `$ARGUMENTS`)

This stage is intentionally task-driven. Determine which task(s) to execute using `$ARGUMENTS`:

- If `$ARGUMENTS` contains one or more Task IDs like `T006` / `T042`, execute those tasks only.
- Else, if `$ARGUMENTS` contains `next N` or a bare number `N`, execute the next `N` incomplete tasks (cap at 5).
- Else (empty or anything else), execute exactly the **next 1** incomplete task.

If a requested Task ID is already completed (`[x]`), skip it and report that it was already done.
If a requested Task ID cannot be found, ERROR and stop.

## Execution Steps

### 1) Resolve feature paths (single source of truth)

Run `SKILL_DIR/scripts/bash/check-prerequisites.sh --json --require-tasks --include-tasks` once from repo root and parse JSON for:

- `FEATURE_DIR`
- `AVAILABLE_DOCS`

Derive absolute paths:

- `TASKS = FEATURE_DIR/tasks.md`
- `PLAN = FEATURE_DIR/plan.md`
- `SPEC = FEATURE_DIR/spec.md`

If the user selected a feature for this invocation (via leading `029`, `SPECIFY_FEATURE=...`, or `spec=029`), pass it explicitly to scripts using `--feature <id>` (e.g., `--feature 029`) to avoid implicit inference.

### 2) Checklist gate (fast, file-light)

If `FEATURE_DIR/checklists/` exists:

- For each checklist file, compute `total / done / todo` by counting checklist lines (e.g. using `rg` on `^- \\[[ xX]\\]`).
- If any checklist has unfinished items, STOP and ask the user:
  - "Some checklists are incomplete. Do you want to proceed with this task anyway? (yes/no)"
  - Wait for user response.
- If all checklists are complete (or no checklists dir), continue.

### 3) Load minimal required context

1. Read `TASKS` fully.
2. Do NOT read `SPEC`, `PLAN`, `research.md`, `data-model.md`, `quickstart.md`, `contracts/` yet.
3. Only load additional files when the selected task(s) require them.

**Optional**: If (and only if) the selected task mentions architecture/stack/project structure and `PLAN` is needed to decide file locations, read `PLAN` (but prefer scanning only the relevant headings/sections).

### 4) Select the task(s) to execute

From the parsed `TASKS` file:

- Identify incomplete tasks: lines matching `- [ ] T\\d+`.
- Map Task ID → full task line text (description, file paths, story labels).

Apply the selection rules defined above (Task IDs / next N / next 1).

### 5) For EACH selected task: execute in a tight loop

For each task (in order):

1. **Determine the working set (no wandering)**:
   - Extract file paths mentioned in the task line (e.g., `packages/foo/src/x.ts`).
   - If the task line does not name file paths, derive the minimum search keys (symbol names, package names, error types).
2. **Load only what you need**:
   - If file paths are present: open those files first.
   - If not: use targeted search (`rg`) to locate the smallest relevant entrypoints.
   - Only if search is insufficient, use one targeted `auggie.codebase-retrieval` call scoped to the current task.
3. **Implement the task**:
   - Make minimal, focused changes.
   - Avoid unrelated refactors.
4. **Minimal validation for this task**:
   - Prefer the smallest relevant check described by the repo or by the task itself (unit test, package test, or a single command).
   - If no guidance exists, do a local, lightweight sanity check appropriate for the change (do not run large suites by default).
5. **Mark completion**:
   - Update `TASKS`: change this task line from `- [ ]` to `- [x]`.
   - If the task requires adding notes/evidence (e.g. perf baselines), write them to the specified artifact and keep them brief.
6. **Stop condition**:
   - After each task, if more tasks remain in this batch, continue.
   - After the batch completes, STOP and report what was done and what the next unchecked task is.

## Output / Reporting

At the end, report:

- Which task IDs were executed and marked complete
- Key files changed (paths only)
- Any remaining blockers / required clarifications (if any)
- Suggested next command, e.g. `$speckit implement-task <feature> next` or `$speckit implement-task <feature> T0XX`
