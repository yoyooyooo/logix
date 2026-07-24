# Human-Agent SOP

## Operating Loop

```text
human input
  -> inspect current repository state
  -> classify claim and lifecycle distance
  -> place in the correct layer or method
  -> choose the thinnest earned shape and identity
  -> freeze authority and evidence boundary
  -> plan only the reachable slice
  -> implement and verify
  -> report proven claims
  -> promote remaining gaps into the next loop
```

## Read Before Writing

Default path:

```text
AGENTS.md
repo-local docs policy
docs/README.md
affected layer README
affected artifact and its direct authorities/evidence
```

Missing optional layers are not defects. Create only the thinnest router or authority artifact needed for the current work.

## Input Classification

Treat input as one of:

- governance convergence;
- workflow supplement;
- source/input placement;
- accepted authority change;
- future capability route;
- implementation/spec handoff;
- audit or cleanup;
- partition/flattening review;
- identity/traceability admission.

## Decision Queue

Record an explicit decision item when inputs conflict or a higher authority must choose:

```text
id:
source_artifacts:
conflict:
options:
decision_level:
owner:
needed_by:
status: open | decided | obsolete
resolution_target:
```

After decision, promote the result to the owning authority, link execution, backlink the sources, and retire obsolete candidate text.

## Agent Legwork

Within clear authority and scope, the agent should repair thin routers, links, local indexes, harnesses, audit scripts, and traceability plumbing rather than offloading routine work to the human.

Escalate only when:

- no honest falsifiable evidence path exists;
- continuing changes product truth, SSoT, Standards, ADR, public contract, security posture, or claim standard;
- unsafe private data or retention risk is involved;
- two plausible authorities remain unresolved;
- legal, compliance, release-history, or irreversible data risk is present.

## Convergence Sweep

```text
promote   accepted meaning becomes authority
lower     unsupported current claim becomes target/future/evidence
partition durable boundary earns a child route
flatten   redundant partition returns to its parent
split     one artifact contains different authority/lifecycle concerns
merge     duplicates become one coherent owner
bridge    thin routing or traceability gap is repaired
retain    source/evidence still changes future decisions
delete    obsolete material has no route or evidence value
block     higher-authority decision is required
```

## Completion Criterion

A governance pass is complete only when every affected artifact has:

- a claim class and lifecycle verdict;
- one semantic owner;
- an admitted shape and identity level;
- preserved source/evidence links where needed;
- updated nearest indexes and links;
- audit output with blockers, review signals, exceptions, and unverified claims.
