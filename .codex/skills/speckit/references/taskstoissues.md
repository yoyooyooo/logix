---
description: Convert existing tasks into actionable, dependency-ordered GitHub issues for the feature based on available design artifacts.
tools: ['github/github-mcp-server/issue_write']
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

## Outline

1. Run `SKILL_DIR/scripts/bash/check-prerequisites.sh --json --require-tasks --include-tasks` from repo root and parse FEATURE_DIR and AVAILABLE_DOCS list. If you need to target a specific spec by number/id, add `--feature 025` (or `--feature 025-my-feature`). All paths must be absolute. For single quotes in args like "I'm Groot", use escape syntax: e.g 'I'\''m Groot' (or double-quote if possible: "I'm Groot").
1. From the executed script, extract the path to **tasks**.
1. Determine the target GitHub repository **from user input** (do not infer from local repo configuration):
   - Accept either `owner/repo` or a full `https://github.com/owner/repo` URL.
   - If the user did not provide the repo in `$ARGUMENTS` or earlier messages, ask once for it and stop.

1. For each task in the list, use the GitHub MCP server to create a new issue in the **explicitly provided** repository.

> [!CAUTION]
> UNDER NO CIRCUMSTANCES EVER CREATE ISSUES IN REPOSITORIES THAT DO NOT MATCH THE EXPLICITLY PROVIDED REPO
