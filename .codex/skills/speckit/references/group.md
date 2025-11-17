---
description: Create/update a Spec Group execution checklist (a meta spec that dispatches multiple feature specs).
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Goal

Treat a “Spec Group” as a **meta spec** that coordinates multiple feature specs and provides a single entrypoint for humans/agents, without duplicating implementation details.

This stage is intentionally **index-only**:

- ✅ Create/refresh a group-level checklist under `specs/<group>/checklists/`
- ✅ Reference member specs via links to their `tasks.md` / `quickstart.md`
- ❌ Do NOT copy/paste member tasks into the group spec (avoid parallel truth sources)

> Note: This is different from `$speckit checklist` (requirements-quality unit tests). Here we generate an **execution checklist** for a multi-spec deliverable.

## Interface (recommended)

`$ARGUMENTS` format:

- First token: **group feature id** (e.g., `046` or `046-core-ng-roadmap`)
- Remaining tokens (optional): **member feature ids** (e.g., `045 039`)
- Optional key/value args:
  - `name=<slug>` (or `--name <slug>`) → checklist file name (default: `group.<members>.md`)
  - `title=<text>` (or `--title <text>`) → checklist title
  - `--from registry` → when member ids are omitted, derive members from `specs/<group>/spec-registry.json`（fallback 为 `spec-registry.md`）（default）
  - `--force` → overwrite the existing checklist file
  - `--dry-run` → only resolve paths / show output path, do not write files

Examples:

- `$speckit group 046 045 039 name=m0-m1 title="M0→M1"`
- `$speckit group 046 --name group.registry`（只给总控 spec：从 registry 推导成员）
- `$speckit group 046-core-ng-roadmap 045-dual-kernel-contract 039-trait-converge-int-exec-evidence --name m0-m1`

## Parallel Development Safety (Non-Negotiable)

- Assume the working tree may contain unrelated, uncommitted changes from other concurrent tasks.
- ABSOLUTELY PROHIBITED: any form of `git restore`, `git checkout -- <path>`, `git reset`, `git clean`, `git stash`.
- Avoid staging/committing/history rewriting unless explicitly requested by the user: `git add`, `git commit`, `git rebase`, `git merge`, `git cherry-pick`, `git push`.
- Read-only git commands are allowed (e.g., `git status`, `git diff`).

## Execution Steps

1) **Generate group checklist (write)**  
From repo root, run:

`SKILL_DIR/scripts/bash/spec-group-checklist.sh <group> [<member...>] [--from registry] [--name <name>] [--title <title>] [--force]`

2) **Optional: show progress summary (read-only)**  
Use the built-in multi-feature task extractor:

`SKILL_DIR/scripts/bash/extract-tasks.sh --json --feature <member1> --feature <member2> ...`

2.5) **Optional: show dependency graph (read-only)**  
Render dependency graph from `spec-registry.json`:

`SKILL_DIR/scripts/bash/spec-registry-graph.sh <group>`

Or merge all groups:

`SKILL_DIR/scripts/bash/spec-registry-graph.sh --all`

3) **Optional: group acceptance (read-only)**  
You can already validate multiple specs together using:

`$speckit acceptance <member1> <member2> ...`

## Output

- Print the generated checklist file path.
- If the file already exists and `--force` is not provided, stop and ask whether to overwrite or create a new name.

## 与其它 stage 的关系（如何搭配使用）

> 结论：**Group 不取代 `plan/tasks/implement`**。它提供“只记总控编号”的入口与派发视图；实现细节仍留在各 member spec 内，避免并行真相源。

- `$speckit plan <group>` / `$speckit tasks <group>`：仍然只作用于 **group spec 自己**（写“路线图/门槛/调度/证据回写”），不要把 member 的实现 tasks 复制进来。
- `$speckit group <group>`：生成/刷新 `specs/<group>/checklists/*` 的**索引清单**（成员跳转 + gate 汇总），是你“只记 046”时的主要导航页。
- `$speckit implement-task <member> ...`：真正改代码通常发生在 member spec；从 group checklist 跳到 member 的 `tasks.md` 再执行更稳妥。
- `$speckit acceptance <member...>`：已支持 multi-spec；若你只想输入总控编号，用 `spec-registry.json` 推导 members（脚本会 fallback 到 md）：`spec-group-members.sh <group> --json`。
