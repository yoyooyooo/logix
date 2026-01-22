---
description: Maintain North Stars (SSoT) + derived index (`.specify/memory/north-stars.md`) without accidental overwrites.
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

## Intent

`.specify/memory/north-stars.md` is an OPTIONAL, repo-specific “derived index” used by speckit/specs to reference `NS-*` / `KF-*`
without loading the long source-of-truth document every time.

Hard rules:

- Source of truth remains: `docs/ssot/platform/foundation/04-north-stars.md`
- This file MUST NOT be overwritten by other speckit stages.
- Default behavior MUST be non-destructive: create if missing; otherwise leave untouched.
- The derived index sync MUST be explicit and MUST only update the `GENERATED` block (between markers).
- Do NOT treat the derived index as an editable source of truth for NS/KF; only the SSoT doc is editable.

## Behavior

Interpret `$ARGUMENTS`:

- If it contains `init`: init mode (ensure the derived index file exists; do not overwrite; do not sync).
- If it contains `sync`: run sync mode (update the GENERATED block only).
- If it contains `update` or `amend`: run “universal update” mode:
  - If the user explicitly asked to change NS/KF content, update `docs/ssot/platform/foundation/04-north-stars.md` first (SSoT),
    then sync the derived index.
  - If the user did NOT ask to change NS/KF content (e.g. just wants to ensure everything is aligned), treat it as sync-only.
- If it contains `force`: allow overwriting the derived index file only when explicitly requested (destructive; used when markers are missing).
- Otherwise: default to the safe “universal update” behavior (sync the derived index only).

## Execution

1) If init mode:
   - Run: `SKILL_DIR/scripts/bash/setup-north-stars.sh --json`

2) If update/amend requested AND the user explicitly asked to change NS/KF:
   - Update the SSoT doc: `docs/ssot/platform/foundation/04-north-stars.md`
   - Constraints (must hold):
     - Never renumber existing `NS-*` / `KF-*` IDs (IDs are stable anchors referenced by specs).
     - New IDs must use the next available integer (append-only).
     - Keep the heading shapes stable for tooling:
       - `### NS-<n>：...`
       - `#### KF-<n>. ... → NS-<n>`
     - Avoid hard-deleting old IDs; prefer “superseded/deprecated” notes to keep references meaningful.
   - Then run sync mode (next step) to refresh the derived index.

3) For default/sync/update/amend (or after SSoT update above):
   - If `force` is requested: run `SKILL_DIR/scripts/bash/setup-north-stars.sh --json --sync --force`
   - Otherwise: run `SKILL_DIR/scripts/bash/setup-north-stars.sh --json --sync`

## Output

- Summarize: mode, created/updated/no-op, and the key file paths.
- Do NOT print large file contents unless requested.
