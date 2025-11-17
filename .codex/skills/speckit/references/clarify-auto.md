---
description: Auto-resolve high-impact ambiguities by running a clarify-style scan and self-answering (no interactive questions), then writing results back into spec.md only.
handoffs:
  - label: Deepen Plan
    agent: speckit.plan-deep
    prompt: Deepen the plan for the spec
  - label: Build Technical Plan
    agent: speckit.plan
    prompt: Create a plan for the spec. I am building with...
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Goal

Run a non-interactive clarification pass:

- Find the most impactful ambiguities / decision points (clarify taxonomy)
- Choose the best recommended/suggested answers **automatically**
- Write the resolved clarifications back into `spec.md` (WHAT only)

This stage MUST NOT create or modify `plan.md` or other Phase 0/1 artifacts.

## Execution Steps

### 1) Resolve paths & load spec

From repo root, run `SKILL_DIR/scripts/bash/check-prerequisites.sh --json --paths-only` once (add `--feature <id>` if needed). Parse:

- `FEATURE_SPEC`
- `FEATURE_DIR`

If `FEATURE_SPEC` is missing, instruct the user to run `$speckit specify` first (do not create a spec here).

Load the current `FEATURE_SPEC`.

### 2) Auto-clarify (self Q&A, non-interactive)

Baseline: read and follow `SKILL_DIR/references/clarify.md` EXACTLY, with these overrides:

- Replace the interactive questioning loop with **self Q&A**:
  - Generate a prioritized queue of candidate clarification questions (max **12**).
  - For each question:
    - Determine the recommended/suggested answer using the same criteria as `clarify`.
    - Auto-accept it (no user prompt).
    - Produce a concise audit-friendly rationale (NOT persisted to disk):
      - `**Decision logic:**` 5–12 bullets, covering Criteria / Tradeoffs / Risks / Implications.
    - Immediately integrate the answer into `spec.md` using the same incremental write rules as `clarify`.
    - Prefix the clarification record line with `AUTO:` (e.g. `- AUTO: Q: ... → A: ...`).

- If a high-impact ambiguity cannot be responsibly auto-resolved:
  - Do not guess silently.
  - Record it under `## Clarifications` as an explicit assumption (prefix the line with `ASSUMPTION:`), and stop (do not continue auto-resolving).

### 3) Report completion

Report:

- How many `AUTO` clarifications were applied
- Whether any `ASSUMPTION` items were recorded
- Path to updated `FEATURE_SPEC`
- Suggested next command (usually `$speckit plan-deep` or `$speckit plan`)

