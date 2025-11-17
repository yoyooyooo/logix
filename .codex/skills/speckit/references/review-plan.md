---
description: Review a speckit feature plan (spec.md + plan.md) and produce a structured review.md for later digestion via $speckit plan-from-review.
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
- This is a **review-plan** stage: do not implement code changes. Only produce `review.md` under the feature directory.

## Goal

Generate a `review.md` report inside `specs/<feature>/review.md` that:

- Is written in **Chinese** by default (unless user explicitly requests English).
- Contains actionable, structured review items with IDs (`R001`, `R101`, ...).
- Clearly maps each recommendation to the correct artifact target:
  - `spec.md` / `plan.md` / `tasks.md` / `data-model.md` / `contracts/*`
- Includes explicit acceptance criteria / validation method for each item.
- Can be later digested and closed-looped by `$speckit plan-from-review <feature>`.

## Execution Steps

### 1) Resolve feature directory (supports direct numeric IDs)

1. Run `SKILL_DIR/scripts/bash/check-prerequisites.sh --json --paths-only` from repo root **once**.
   - If you need to target a specific spec by number/id, add `--feature 042` (or `--feature 042-my-feature`).
   - Parse minimal JSON payload fields:
     - `FEATURE_DIR`
     - `FEATURE_SPEC`
     - (Optionally capture `IMPL_PLAN`, `TASKS` if present.)
   - If JSON parsing fails, stop and instruct the user to re-run `$speckit specify` / `$speckit plan` or verify the feature selection.

2. Derive paths:
   - `SPEC_FILE = FEATURE_SPEC` (spec.md)
   - `PLAN_FILE = FEATURE_DIR/plan.md` (must exist)
   - `TASKS_FILE = FEATURE_DIR/tasks.md` (optional)
   - `REVIEW_FILE = FEATURE_DIR/review.md` (output)

If `PLAN_FILE` does not exist, stop and instruct the user to run `$speckit plan <feature>` first.

### 2) Load context (do not guess missing artifacts)

Read:
- `SPEC_FILE`
- `PLAN_FILE`
- `.specify/memory/constitution.md`

If present and relevant, also read:
- `TASKS_FILE`
- `FEATURE_DIR/research.md`
- `FEATURE_DIR/data-model.md`
- `FEATURE_DIR/contracts/*` (only if the plan/spec declares external contracts or you need to audit protocol/API correctness)

If you do not have codebase access, state that explicitly in the report under “Assumptions”, and avoid claiming verification of referenced files/symbols.

### 3) Perform the review (aligned to speckit artifact boundaries)

Cover these dimensions (mark N/A when not relevant):

1. Spec ↔ Plan alignment
   - Is every FR/NFR/SC and success criteria in `spec.md` addressed in `plan.md`?
   - Is there scope creep in `plan.md` that is not declared in `spec.md`?

2. Constitution / quality gates
   - Are the Constitution Check items complete, executable, and compliant?
   - If touching runtime core paths / diagnostic protocols / public APIs:
     - Is there a reproducible performance baseline & measurement plan?
     - Are diagnostic events/surfaces and overhead budgets specified?

3. Tasks consistency (tasks.md is the only task list artifact)
   - If `tasks.md` exists: are tasks executable (concrete file paths, dependencies/parallelism, validation)?
   - If `tasks.md` does not exist: do NOT ask to add “Phase 2 tasks” into `plan.md`;
     instead, list task suggestions in the review and require `$speckit tasks` next.

4. Risks & mitigations
   - Performance regression risks, diagnosability gaps/cost, breaking changes & missing migration notes,
     IR/anchor drift, non-deterministic identity (random/time defaults), IO inside transaction window,
     writable escape hatches (e.g., SubscriptionRef), etc.
   - Every risk must have a concrete mitigation and a validation plan.

### 4) Write `review.md` (MUST follow this template)

Create or overwrite `REVIEW_FILE` with:

```markdown
# Review Report: [FEATURE_ID - Feature Name]

**Status**: [REQUEST_CHANGES / APPROVED_WITH_SUGGESTIONS / APPROVED]
**Digest**: PENDING
**Reviewer**: [name]
**Date**: YYYY-MM-DD

## 0. Assumptions

- [If any, e.g. “No codebase access; referenced paths not verified.”]

## 1. 执行摘要 (Executive Summary)

- 一句话裁决：[…]
- Top 3 issues（若有）：[…]

## 2. 必须修改 (Blockers)

> 只列会阻塞进入实现/拆任务的点

- R001 [BLOCKER] [Target: plan.md] [Location: plan.md#…] 问题：… 建议：… 验收：…
- R002 [BLOCKER] [Target: spec.md] [Location: spec.md#…] 问题：… 建议：… 验收：…

## 3. 风险与建议 (Risks & Recommendations)

- R101 [MAJOR] [Risk] … 缓解：… 验证：…
- R102 [MINOR] [Suggestion] … 验证：…

## 4. 技术分析 (Technical Analysis)

- 架构合理性：…
- 与仓库既有约定对齐点/偏离点：…
- 可实施性与复杂度：…

## 5. 宪法与质量门检查 (Constitution Check)

- 性能与可诊断性：PASS/CONCERN/N/A — 证据：… 下一步：…
- IR/锚点漂移风险：PASS/CONCERN/N/A — …
- 稳定标识（instanceId/txnSeq/opSeq）：PASS/CONCERN/N/A — …
- 事务窗口（禁止 IO）：PASS/CONCERN/N/A — …
- 破坏性变更与迁移说明：PASS/CONCERN/N/A — …
- （如涉及 packages/*）public submodules / internal 分层：PASS/CONCERN/N/A — …

## 6. 覆盖与漂移 (Coverage & Drift)

- 未覆盖的 FR/NFR/SC（只列缺口）：…
- plan ↔ tasks（如存在 tasks.md）的漂移点：…

## 7. Next Actions

- 把本文件保存为 `specs/<feature>/review.md`。
- 回到 speckit 会话，执行：`$speckit plan-from-review <feature-id>`（必要时再跑 `$speckit tasks` 刷新任务清单）。
```

### 5) Report

In your final response, include:
- The `review.md` path you produced.
- The recommended next command(s): typically `$speckit plan-from-review <feature-id>`.
