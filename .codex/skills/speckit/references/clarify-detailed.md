---
description: Run the standard clarify workflow, but require detailed, audit-friendly decision logic behind each recommended/suggested answer (not just 1–2 sentences).
handoffs:
  - label: Build Technical Plan
    agent: speckit.plan
    prompt: Create a plan for the spec. I am building with...
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

Goal: Same as `$speckit clarify`, but with a higher bar for explaining *why* a particular option/answer is recommended.

## Baseline (Do Not Re-invent)

- First, read and follow `SKILL_DIR/references/clarify.md` EXACTLY.
- This stage is an overlay: all limits (≤5 questions), file writes (incremental spec updates), and validation rules from `clarify.md` still apply unless overridden below.

## Overrides (Detailed Recommendation Rationale)

Override Step 4's recommendation/suggestion reasoning requirements with the following.

### Multiple-choice questions

When presenting the next question:

1. Keep the recommendation line (same placement as `clarify.md`):
   - `**Recommended:** Option [X] - <one-sentence summary>`

2. Immediately provide a **Decision logic** block (NOT persisted to disk):
   - Minimum: 5 bullets. Maximum: 12 bullets.
   - Must be specific to the current spec (reference the relevant spec constraint/section when possible).
   - Must cover, at minimum:
     - Decision criteria (what you optimize for and why)
     - Tradeoffs and why the runner‑up lost
     - Risks / failure modes and mitigations
     - Downstream implications (architecture, data model, UX, tests, operations)

   Template:
   - `**Decision logic:**`
     - `- Criteria: ...`
     - `- Tradeoffs: ...`
     - `- Risks: ...`
     - `- Implications: ...`
     - (Add more bullets as needed, within the 5–12 limit.)

3. Then render the options table exactly as in `clarify.md`, and include the same instruction for how the user can reply.

### Short-answer questions

When presenting the next question:

1. Keep the suggestion line (same placement as `clarify.md`):
   - `**Suggested:** <answer> - <one-sentence summary>`

2. Provide the same **Decision logic** block (min 5 / max 12 bullets), tailored to the free-form answer.

3. Then output the same short-answer reply format instructions as in `clarify.md`.

## Quality Bar

- Avoid generic filler ("best practice", "common pattern") unless you explain how it applies here.
- Do not output long chain-of-thought; write concise, audit-friendly justification bullets.
