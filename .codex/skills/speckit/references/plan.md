---
description: Execute the implementation planning workflow using the plan template to generate design artifacts.
handoffs: 
  - label: Create Tasks
    agent: speckit.tasks
    prompt: Break the plan into tasks
    send: true
  - label: Create Checklist
    agent: speckit.checklist
    prompt: Create a checklist for the following domain...
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

## Spec Group（总控 spec）特殊说明

如果本次目标 feature 是 **Spec Group**（其目录内存在 `spec-registry.md`，例如 `specs/046-core-ng-roadmap/`），则本阶段的“plan”应当是**调度/门槛/证据回写**导向：

- 计划内容以文档交付为主（roadmap/registry/checklists/quickstart），不生成业务侧 `contracts/`、`data-model.md`（可写明 N/A）。
- 计划中必须明确：成员 specs 的依赖顺序、里程碑达标口径、证据落盘与回写落点（避免并行真相源）。
- 需要生成/刷新 group 执行索引清单时，用 `$speckit group <group>`（由 registry 推导 members）。

1. **Setup**: Run `SKILL_DIR/scripts/bash/setup-plan.sh --json` from repo root and parse JSON for FEATURE_SPEC, IMPL_PLAN, SPECS_DIR, BRANCH. If you need to target a specific spec by number/id, add `--feature 025` (or `--feature 025-my-feature`). For single quotes in args like "I'm Groot", use escape syntax: e.g 'I'\''m Groot' (or double-quote if possible: "I'm Groot").

1.5 **Update spec status** (monotonic, no regression): Run `SKILL_DIR/scripts/bash/update-spec-status.sh --ensure --status Planned` (add `--feature <id>` if needed). This will move `**Status**` from Draft → Planned when planning is ready, and keep Active/Done untouched.

2. **Load context**: Read FEATURE_SPEC and `.specify/memory/constitution.md`. Load IMPL_PLAN template (already copied).

3. **Execute plan workflow**: Follow the structure in IMPL_PLAN template to:
   - Fill Technical Context (mark unknowns as "NEEDS CLARIFICATION")
   - Fill Constitution Check section from constitution
   - Evaluate gates (ERROR if violations unjustified)
   - Phase 0: Generate research.md (resolve all NEEDS CLARIFICATION)
   - Phase 1: Generate data-model.md, contracts/, quickstart.md
   - Re-evaluate Constitution Check post-design

4. **Stop and report**: Command ends after Phase 2 planning. Report branch, IMPL_PLAN path, and generated artifacts.

## Phases

### Phase 0: Outline & Research

1. **Extract unknowns from Technical Context** above:
   - For each NEEDS CLARIFICATION → research task
   - For each dependency → best practices task
   - For each integration → patterns task

2. **Generate and dispatch research agents**:

   ```text
   For each unknown in Technical Context:
     Task: "Research {unknown} for {feature context}"
   For each technology choice:
     Task: "Find best practices for {tech} in {domain}"
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]

**Output**: research.md with all NEEDS CLARIFICATION resolved

### Phase 1: Design & Contracts

**Prerequisites:** `research.md` complete

1. **Extract entities from feature spec** → `data-model.md`:
   - Entity name, fields, relationships
   - Validation rules from requirements
   - State transitions if applicable

2. **Generate API contracts** from functional requirements:
   - For each user action → endpoint
   - Use standard REST/GraphQL patterns
   - Output OpenAPI/GraphQL schema to `/contracts/`

**Output**: data-model.md, /contracts/\*, quickstart.md

## Key rules

- Use absolute paths
- ERROR on gate failures or unresolved clarifications
