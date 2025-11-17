---
description: Deepen planning in one pass by running an auto-resolving clarification loop (self Q&A) and then producing a more explicit, implementation-ready plan with fewer unknowns.
handoffs:
  - label: Create Tasks
    agent: speckit.tasks
    prompt: Break the plan into tasks
    send: true
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Goal

Reduce ambiguity and deepen the implementation plan **without interactive questioning**:

1) Use a clarify-style ambiguity scan, but **self-answer** the highest-impact questions by selecting the best option/recommended answer.
2) Write the resolved clarifications back into the spec (same integration rules as `clarify`).
3) Produce / refine `plan.md` and Phase 0/1 artifacts (`research.md`, `data-model.md`, `contracts/`, `quickstart.md`) with a higher explicitness bar (fewer "TBD"/"NEEDS CLARIFICATION") and no drift from the updated spec.

## Operating Constraints

- Assume unrelated parallel work exists; never run destructive git/system commands.
- Keep spec as WHAT and plan as HOW. Only write HOW decisions into plan; write WHAT clarifications into spec.
- Do not ask the user questions in this stage. If a decision is too risky to auto-resolve, record it as an explicit **Assumption** with a clear follow-up validation step.

## Execution Steps

### 1) Resolve paths & prerequisites

From repo root, run `SKILL_DIR/scripts/bash/check-prerequisites.sh --json --paths-only` once (add `--feature <id>` if needed). Parse:

- `FEATURE_SPEC`
- `IMPL_PLAN`
- `FEATURE_DIR`

If `FEATURE_SPEC` is missing, instruct the user to run `$speckit specify` first (do not create a spec here).
If `IMPL_PLAN` is missing or empty, run `SKILL_DIR/scripts/bash/setup-plan.sh --json` to initialize it from the template (do not overwrite unless explicitly asked).

Load `.specify/memory/constitution.md` and the latest `FEATURE_SPEC`.

### 2) Auto-clarify (self Q&A, non-interactive)

Baseline: read and follow `SKILL_DIR/references/clarify.md` EXACTLY, with these overrides:

- Replace the interactive questioning loop with **self Q&A**:
  - Generate a prioritized queue of candidate clarification questions (max **12**).
  - For each question, determine the recommended/suggested answer exactly as in `clarify` rules, then **auto-accept** it (no user prompt).
  - For each auto-accepted answer, produce a concise audit-friendly rationale (NOT persisted to disk):
    - `**Decision logic:**` 5–12 bullets, covering Criteria / Tradeoffs / Risks / Implications.
  - Immediately integrate each answer into the spec using the same incremental write rules as `clarify` (create/append in `## Clarifications` and update the appropriate sections).
  - Mark the clarification line with an `AUTO:` prefix, e.g. `- AUTO: Q: ... → A: ...`.

- Stop early if no high-impact ambiguities remain.
- If a high-impact ambiguity cannot be responsibly auto-resolved:
  - Do not guess silently.
  - Record it under `## Clarifications` as an explicit assumption using the same bullet format (prefix the line with `ASSUMPTION:`), and also add a follow-up validation note in `plan.md` (next step).

### 3) Plan deepening (higher explicitness bar)

Baseline: read and follow `SKILL_DIR/references/plan.md` EXACTLY, with these additional requirements:

- Keep Phase 0/1 artifacts aligned:
  - If `research.md` / `data-model.md` / `contracts/` / `quickstart.md` already exist, update them to reflect the newly applied `AUTO`/`ASSUMPTION` clarifications (do not leave stale contradictions).
  - If they do not exist, generate them following the plan workflow.
- Eliminate placeholders:
  - No `NEEDS CLARIFICATION` left in `Technical Context` unless it is truly unavoidable; when unavoidable, convert it into an explicit assumption + a validation task.
- Make decisions explicit and testable:
  - Fill the `Perf Evidence Plan（MUST）` section with either a concrete evidence plan or `N/A` plus a concrete rationale.
  - If the plan touches Logix runtime hot paths, ensure the plan includes reproducible baseline/diff commands consistent with the perf-evidence references.
- Add a short `## Deepening Notes` section near the top of `plan.md`:
  - Include up to 8 bullets of the most consequential auto-decisions (not all), each as `- Decision: <...> (source: spec clarify AUTO/ASSUMPTION)`.
- Ensure the final plan can drive `$speckit tasks` deterministically (clear structure, stable file paths, measurable gates).

### 4) Report completion

Report:

- How many AUTO clarifications were applied to spec
- Whether any ASSUMPTION items remain (list them)
- Paths written: `FEATURE_SPEC`, `IMPL_PLAN`, and any generated Phase 0/1 artifacts
- Suggested next command (`$speckit tasks` recommended)
