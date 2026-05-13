# Taste Pressure Reference

## Purpose

This reference gives Logix API planning a first-class place to evaluate taste without letting taste become unbounded preference.

Taste here means the felt quality of an API shape after hard correctness, owner law, proof, and surface containment have been respected. It covers human first-read, naming honesty, route symmetry, concept density, progressive disclosure, and the amount of explanation needed before a user can make the right move.

This document is a bridge for possible future dedicated taste-analysis skills. It is intentionally separate from the main workflow so that taste criteria can evolve without hiding inside capability coverage prose.

## Authority Boundary

Taste never overrides:

- P0 hard laws
- single truth / single owner / single authority
- concept-count control
- public-surface containment
- proof obligations for claimed capabilities
- Agent-first generation and validation stability

Taste can decide between candidates only after the higher gates are satisfied or when the higher gates explicitly leave a tradeoff unresolved.

Taste can trigger pressure when a shape is technically covered but repeatedly needs unnatural explanation, misleading naming, route exceptions, or demo-only ceremony to appear usable.

## Dual Audience Rule

Logix API shape is Agent-first, with human acceptance as a required secondary pressure lane.

Every human-facing pressure packet should separate:

- `agent_cost`: generation branches, hidden state, validation stability, recoverability from errors
- `human_cost`: first-read friction, memory load, teaching burden, visible ceremony
- `taste_cost`: naming honesty, symmetry, locality, route count, concept density, progressive disclosure

If Agent-first and human taste conflict, the default tie-breaker is:

1. P0 hard laws
2. concept-count
3. public-surface
4. Agent generation and validation stability
5. proof strength
6. human first-read
7. taste refinement

The tie-breaker can be challenged only with evidence that the current shape creates recurring human failure, not with local preference.

## Taste Rubric

Use these axes to compare frozen shape, counter-shapes, and no-change decisions.

| axis | good signal | bad signal |
| --- | --- | --- |
| `symmetry` | related read/write or declare/read routes rhyme without adding duplicate owners | route pairs look similar but hide different truth owners |
| `locality` | a concept appears where its owner and lifecycle naturally live | users must jump across packages or layers to understand one act |
| `name_honesty` | nouns reveal whether a value is final truth, soft fact, evidence, helper, or host route | names invite users to put final truth in a soft lane or host truth in a domain lane |
| `route_count` | the main path stays narrow and exceptions are rare | convenience routes multiply equivalent choices |
| `concept_density` | one concept covers many related capabilities without becoming vague | each capability grows its own public noun or one noun becomes a junk drawer |
| `progressive_disclosure` | simple cases teach the same mental model that advanced cases extend | tutorials must switch models halfway through |
| `negative_space` | rejected routes are clear enough that users avoid them | docs must repeatedly warn against plausible wrong paths |
| `error_recoverability` | wrong usage produces explainable diagnostics or obvious fixes | wrong usage fails late, silently, or with internal vocabulary |
| `example_integrity` | examples are canonical and do not need demo-only helpers | examples look better than the real route through wrappers or casts |

## Overfit / Underfit Guard

Before changing public shape for taste or human acceptance, answer both sides.

Overfit checks:

- Is the friction only present in one demo or one wording?
- Would the new concept optimize the example while weakening owner law?
- Does the new route duplicate an existing route with nicer spelling only?
- Does it add a public noun where a tutorial, naming note, or stricter diagnostic would solve the issue?
- Does it make Agent generation branch across equivalent choices?

Underfit checks:

- Does the same human confusion recur across multiple scenarios, pressure packets, or reviews?
- Does the status quo require users to memorize hidden exceptions?
- Does a name consistently mislead users about truth ownership?
- Does the canonical tutorial need too much defensive explanation before useful authoring begins?
- Does the current shape keep concept count low by pushing real complexity into invisible substrate?

The planning decision must record which side is more likely and why.

## Human Status Quo Burden

When a pressure packet keeps the current public API shape after human-facing pressure, it must carry a human burden, not just a capability burden.

Minimum questions:

- Can a human read the combined witness and identify the owner lanes?
- Can the canonical tutorial teach the path without a second mental model?
- Can a user predict where to put source, soft fact, final truth, read helper, and verification logic?
- Can the discomfort be explained as necessary containment, not accidental ceremony?
- Are the rejected nicer-looking alternatives rejected for concrete owner, proof, or surface reasons?
- What docs, examples, or diagnostics carry the remaining friction?

If these cannot be answered, the slice should produce a docs task, diagnostic task, counter-shape, `COL-*`, or authority writeback request.

## Decision Latch

Taste discussions are prone to repeated reopening. Every taste or human-facing pressure close must include a latch.

The latch records:

- `latched_decision`: no-change, docs-task, diagnostic-task, counter-shape-rejected, authority-writeback, reopen-shape
- `reopen_evidence`: the minimum new evidence needed to reopen
- `settled_arguments`: arguments that should not be repeated without new evidence
- `allowed_followups`: docs, examples, diagnostics, implementation probe, or authority intake
- `forbidden_shortcuts`: public helper, wrapper, path noun, metadata object, or hook family that cannot be reintroduced by taste alone

The latch does not make the decision permanent. It prevents cycling on the same taste complaint without stronger evidence.

## Output Discipline

Taste analysis must end in one of these outputs:

- `no-change-human-burden-met`
- `docs-or-example-task`
- `diagnostic-task`
- `implementation-friction-probe`
- `counter-shape-rejected`
- `COL-*`
- `PRIN-*`
- `authority-writeback`
- `reopen-frozen-shape`

Avoid outputs like “feels better” or “more elegant” unless they are attached to the rubric axes above and passed through the decision policy.
