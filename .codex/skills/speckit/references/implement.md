---
description: Execute the implementation plan by processing and executing all tasks defined in tasks.md
handoffs:
  - label: Acceptance Review
    agent: spec.acceptance
    prompt: Run a post-implementation acceptance review
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

## Spec Group 快捷模式（`$speckit implement 046` 之类）

如果本次 target feature 是 **Spec Group**（其 feature 目录内存在 `spec-registry.json`，fallback 为 `spec-registry.md`），则把它视为“总控调度入口”：

1) 解析 members（registry 顺序）
   - 运行：`SKILL_DIR/scripts/bash/spec-group-members.sh <group> --json`
   - 取输出里的 `members`（例如 `["045","039",...]`），按顺序依次推进（去重即可）。

2) 生成/刷新 group 执行索引清单（可选，但推荐）
   - 运行：`SKILL_DIR/scripts/bash/spec-group-checklist.sh <group> --from registry --name group.registry`
   - 若文件已存在且未传 `--force` 导致报错：不要覆盖，继续后续步骤即可（索引清单不是硬门槛）。

3) 对每个 member 执行本 implement 流程（“递归”执行）
   - 对每个 member：把下面 Outline 的第 1 步改为显式 `--feature <member>`，其余步骤不变。
   - 建议：在 group 模式下把 “checklists gate” 视为 **信息提示**（显示表格但不阻塞），避免总控入口需要二次交互确认。

4) member 完成后的回写（推荐）
   - 若存在 group checklist（例如 `specs/<group>/checklists/group.registry.md`），可把对应 member 行从 `- [ ]` 标为 `- [x]`（作为“总控视图进度”）。
   - 全部 members 完成后，直接跑一次：`$speckit acceptance <group>`（acceptance 会展开 group members）。

## Outline

1. Run `SKILL_DIR/scripts/bash/check-prerequisites.sh --json --require-tasks --include-tasks` from repo root and parse FEATURE_DIR and AVAILABLE_DOCS list. If you need to target a specific spec by number/id, add `--feature 025` (or `--feature 025-my-feature`). All paths must be absolute. For single quotes in args like "I'm Groot", use escape syntax: e.g 'I'\''m Groot' (or double-quote if possible: "I'm Groot").

2. **Check checklists status** (if FEATURE_DIR/checklists/ exists):
   - Scan all checklist files in the checklists/ directory
   - For each checklist, count:
     - Total items: All lines matching `- [ ]` or `- [X]` or `- [x]`
     - Completed items: Lines matching `- [X]` or `- [x]`
     - Incomplete items: Lines matching `- [ ]`
   - Create a status table:

     ```text
     | Checklist | Total | Completed | Incomplete | Status |
     |-----------|-------|-----------|------------|--------|
     | ux.md     | 12    | 12        | 0          | ✓ PASS |
     | test.md   | 8     | 5         | 3          | ✗ FAIL |
     | security.md | 6   | 6         | 0          | ✓ PASS |
     ```

   - Calculate overall status:
     - **PASS**: All checklists have 0 incomplete items
     - **FAIL**: One or more checklists have incomplete items

   - **If any checklist is incomplete**:
     - Display the table with incomplete item counts
     - **STOP** and ask: "Some checklists are incomplete. Do you want to proceed with implementation anyway? (yes/no)"
     - Wait for user response before continuing
     - If user says "no" or "wait" or "stop", halt execution
     - If user says "yes" or "proceed" or "continue", proceed to step 3

   - **If all checklists are complete**:
     - Display the table showing all checklists passed
     - Automatically proceed to step 3

3. Load and analyze the implementation context:
   - **REQUIRED**: Read tasks.md for the complete task list and execution plan
   - **REQUIRED**: Read plan.md for tech stack, architecture, and file structure
   - **IF EXISTS**: Read data-model.md for entities and relationships
   - **IF EXISTS**: Read contracts/ for API specifications and test requirements
   - **IF EXISTS**: Read research.md for technical decisions and constraints
   - **IF EXISTS**: Read quickstart.md for integration scenarios
   - **IF EXISTS**: Read notes/ for entry points, invariants, and session context (Non-SSoT)

   If this run involves long-chain exploration and you suspect the session may compact, proactively run `$speckit notes <feature>` to flush "entry points + next actions" before continuing.

4. Parse tasks.md structure and extract:
   - **Task phases**: Setup, Tests, Core, Integration, Polish
   - **Task dependencies**: Sequential vs parallel execution rules
   - **Task details**: ID, description, file paths, parallel markers [P]
   - **Execution flow**: Order and dependency requirements

5. Execute implementation following the task plan:
   - **Phase-by-phase execution**: Complete each phase before moving to the next
   - **Respect dependencies**: Run sequential tasks in order, parallel tasks [P] can run together
   - **Follow TDD approach**: Execute test tasks before their corresponding implementation tasks
   - **File-based coordination**: Tasks affecting the same files must run sequentially
   - **Validation checkpoints**: Verify each phase completion before proceeding

6. Implementation execution rules:
   - **Setup first**: Initialize project structure, dependencies, configuration
   - **Tests before code**: If you need to write tests for contracts, entities, and integration scenarios
   - **Core development**: Implement models, services, CLI commands, endpoints
   - **Integration work**: Database connections, middleware, logging, external services
   - **Polish and validation**: Unit tests, performance optimization, documentation

7. Progress tracking and error handling:
   - Report progress after each completed task
   - Halt execution if any non-parallel task fails
   - For parallel tasks [P], continue with successful tasks, report failed ones
   - Provide clear error messages with context for debugging
   - Suggest next steps if implementation cannot proceed
   - **IMPORTANT** For completed tasks, make sure to mark the task off as [X] in the tasks file.

8. Completion validation:
   - Verify all required tasks are completed
   - Check that implemented features match the original specification
   - Validate that tests pass and coverage meets requirements
   - Confirm the implementation follows the technical plan
   - Report final status with summary of completed work

Note: This command assumes a complete task breakdown exists in tasks.md. If tasks are incomplete or missing, suggest running `$speckit tasks` first to regenerate the task list.

After implementation, run `$speckit acceptance` to validate the latest codebase against every coded point in `spec.md` (FR/NFR/SC) and detect drift.
