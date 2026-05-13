# Skill Fitness And Judge Core

## Purpose

Define stable evaluation rules for changes to `logix-capability-planning-loop`.

The skill can evolve. The judge core cannot be casually rewritten by the same proposal that wants to pass.

## Immutable Judge Core

These rules are the current fixed evaluator:

- Coverage Kernel from `docs/ssot/capability/01-planning-harness.md`
- P0 Hard Laws from `docs/ssot/capability/02-api-projection-decision-policy.md`
- dominance axes: `concept-count`, `public-surface`, `proof-strength`, `future-headroom`, `forward-only-simplicity`
- decision order from `02-api-projection-decision-policy.md`
- Agent Proposal Delta required fields in `SKILL.md`
- Skill Feedback Packet required fields in `SKILL.md`
- Surface Candidate Registry required fields in `SKILL.md`
- Global API Shape Closure Gate required checks in `SKILL.md`
- Implementation Probe Lane promotion decisions in `SKILL.md`
- Probe Artifact Lifecycle states in `SKILL.md`
- Adversarial Pressure Mode required fields and status quo burden in `SKILL.md`
- Taste Pressure Reference in `references/taste.md`
- static checks listed in `SKILL.md`
- eval prompts in `evals/evals.json`

Forward-only note: this repo currently assumes zero existing users. Compatibility and migration cost can appear as local execution risks, but they must not outrank concept count, public surface, proof strength, or future headroom.

## Hard Gates

Reject a challenger skill patch if any gate fails:

- P0 hard law weakens
- exact authority leakage becomes easier
- proposal delta fields become incomplete
- uncovered caps can be hidden
- collision close predicate becomes optional
- proof gate for claimed caps becomes optional
- generator efficiency check is removed or weakened
- high-risk pressure can skip counter-shape generation
- no-public-change pressure can skip status quo burden
- human-facing pressure can skip dual-audience accounting, human status quo burden, overfit / underfit guard, taste rubric, or decision latch
- taste can outrank P0, concept-count, public-surface containment, Agent-first stability, or proof obligations
- a new public concept can bypass concept admission gate
- surface candidate registry becomes optional for public concept changes
- implementation probe can promote itself into authority
- probe artifact can survive without lifecycle decision
- scenario-specific probe naming can be reused without naming review
- global closure can pass with candidate or under-review surface rows
- sub-agent can edit the skill directly
- static checks fail

## Scored Axes

Use these axes after hard gates pass:

| axis | better means |
| --- | --- |
| `generator-efficiency` | fewer public concepts cover equal or more caps |
| `proof-strength` | more claimed changes bind to executable or planned proof gates |
| `future-headroom` | future proposals collide less and can be sliced more safely |
| `public-surface-containment` | fewer paths allow exact API leakage |
| `concept-count-control` | fewer workflow objects or duplicate ledgers |
| `global-closure-strength` | total API shape readiness is easier to audit mechanically |
| `pressure-strength` | frozen shape is challenged by capability bundles, counter-shapes, and status quo proof |
| `human-pressure-strength` | human first-read and adoption friction are tested without weakening Agent-first or P0 laws |
| `taste-rigor` | taste judgments cite rubric axes, overfit / underfit evidence, and decision latch instead of preference language |
| `probe-discipline` | executable probes produce evidence without leaking authority |
| `probe-lifecycle-control` | temporary verification code is easier to keep, generalize, demote, or delete |
| `sub-agent-compliance` | proposal packets become easier to validate mechanically |
| `synthesis-cost` | main agent needs less manual interpretation |

## Adoption Rule

Adopt a challenger only if:

1. all hard gates pass
2. at least one scored axis improves
3. no core axis regresses
4. affected templates and SSoT references are updated
5. feedback ledger records the decision

Core axes:

- P0 clarity
- public-surface containment
- concept-count control
- global closure strength

## Judge Evolution Gate

Changing the judge core is allowed only through a separate judge evolution review.

Requirements:

- state why the existing judge rejects good work or accepts bad work
- compare old judge and new judge on existing eval prompts
- keep old judge result in the ledger
- use `plan-optimality-loop` when the change touches P0, Coverage Kernel, dominance axes, decision order, or eval set
- update `feedback/ledger.md` with accepted or rejected status

## Current Eval Prompts

The fixed prompt set lives in `evals/evals.json`.

The minimum coverage is:

- proposal creation from a capability slice
- current API shape snapshot
- principle promotion from repeated collisions
- surface candidate registry and global closure
- implementation probe promotion boundary
- probe artifact lifecycle and naming review

Do not remove an eval without replacing its coverage.
