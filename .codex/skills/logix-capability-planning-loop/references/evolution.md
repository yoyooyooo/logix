# Skill Evolution Loop

## Purpose

Define how reusable learnings from sub-agents flow back into this skill without letting one-off preferences rewrite the workflow.

## Roles

| role | meaning |
| --- | --- |
| champion | current committed skill |
| challenger | proposed skill / template / SSoT patch |
| judge core | stable evaluator in `references/fitness.md` |
| feedback packet | structured proposal to change the skill |
| feedback ledger | accepted and rejected skill evolution decisions |
| active learnings | compressed lessons from repeated feedback |

## Loop

1. Collect `Skill Feedback Packet`.
2. Classify feedback as `template`, `workflow`, `SSoT`, `surface-registry`, `probe-lane`, `probe-lifecycle`, `global-closure`, `judge-core`, or `reject`.
3. Convert accepted candidate feedback into a challenger patch.
4. Evaluate challenger against `references/fitness.md`.
5. Adopt only if hard gates pass and scored axes improve.
6. Apply patch with `apply_patch`.
7. Update templates or SSoT references if touched.
8. Record decision in `feedback/ledger.md`.
9. Update `feedback/active-learnings.md` when a lesson recurs.

## Classification

| class | landing |
| --- | --- |
| `template` | `references/templates.md` |
| `workflow` | `SKILL.md` or `references/workflow.md` |
| `SSoT` | `docs/ssot/capability/*` or domain harness |
| `surface-registry` | `docs/next/logix-api-planning/surface-candidate-registry.md` |
| `probe-lane` | `SKILL.md`, `references/workflow.md`, proof ledgers |
| `probe-lifecycle` | `SKILL.md`, `references/workflow.md`, `references/templates.md`, housekeeping |
| `global-closure` | `SKILL.md`, `references/workflow.md`, `references/templates.md` |
| `judge-core` | `references/fitness.md` and possibly evals |
| `reject` | `feedback/ledger.md` |

## Normal Evolution

Normal evolution can change:

- workflow wording
- templates
- packet fields
- common mistakes
- skill patch checks
- feedback ledger structure
- surface candidate registry mechanics
- implementation probe lane mechanics
- probe artifact lifecycle mechanics
- global closure gate checklists

It cannot weaken judge core.

## Judge Evolution

Judge evolution can change:

- Coverage Kernel
- P0 hard laws
- decision order
- dominance axes
- eval prompts
- hard gates
- forward-only priority interpretation

Use this only when old judge demonstrably blocks better work or accepts bad work.

Judge evolution requires:

- explicit old-judge failure case
- old vs new comparison
- review ledger
- accepted or rejected status in `feedback/ledger.md`

## Feedback Packet Quality Bar

Good feedback includes:

- concrete observed gap
- evidence from proposal, collision, proof, or review ledger
- proposed skill change
- risk if added
- risk if ignored
- reuse scope beyond one local case

Weak feedback should be rejected or kept as local note.

## Active Learnings

`feedback/active-learnings.md` summarizes recurring lessons. It helps future agents avoid repeated mistakes, but it does not override:

- Coverage Kernel
- Decision Policy
- Fitness hard gates
- proposal templates
- Surface Candidate Registry
- Probe Artifact Lifecycle
- Global API Shape Closure Gate
