# Lifecycle and Cleanup

Initialization, migration, periodic cleanup, partitioning, and flattening use the same convergence loop with different amounts of existing material.

## Convergence Loop

```text
inspect
  -> classify claims and artifacts
  -> assign lifecycle and retention verdicts
  -> keep or create only thin routing structure
  -> promote authority
  -> demote candidates
  -> partition or flatten only when earned
  -> preserve evidence backlinks
  -> delete obsolete material
  -> update nearest indexes
  -> audit
```

## Lifecycle States

| State | Meaning | Default action |
|---|---|---|
| `missing-baseline` | a needed router or authority entry is absent | create the thinnest useful artifact |
| `active-authority` | current fact, binding, contract, or adopted decision | keep in its owning layer |
| `accepted-target` | adopted delivery target without current proof | keep in the owning target/requirement/decision artifact and link execution |
| `active-route` | current or long-horizon sequence, gate, or route | keep while it still changes decisions |
| `future-capability` | durable future candidate with prerequisites and promotion path | keep as a capability route/capsule |
| `candidate-material` | still under evaluation | keep in the configured candidate method |
| `active-proof` | implementation or validation in progress | route to the configured tracker/spec/evidence owner |
| `converted-source` | consumed by authority but useful for traceability | backlink or retain as source |
| `historical-evidence` | durable past proof or audit | keep in reports/evidence when justified |
| `decision-needed` | real authority conflict requiring a decision | record in the nearest decision queue |
| `obsolete` | superseded with no remaining route or evidence value | delete after reference check |

## Retention Gate

A durable document remains in `docs/**` when it is at least one of:

- current authority or an accepted target;
- an active route, gate, or useful index;
- retained source linked from current authority or a decision;
- durable audit, release, migration, security, or verification evidence;
- a router that materially helps readers choose the correct artifact.

Otherwise delete, demote, merge, or move it to the owning method.

## Shape Lifecycle

### Partition

Partition when durable boundary or navigation pressure has been established. Move the smallest coherent cluster, add a local router only when it improves entry, update inbound links, and preserve shared files at the parent layer.

### Flatten

Flatten when a child directory no longer has an independent boundary, contains only accidental fragmentation, forces symmetric boilerplate, or makes the reading path longer. Move files to the nearest semantic parent, resolve name collisions semantically, update links, then remove the redundant README and directory.

### Merge and Split

- split a mixed artifact only when the resulting parts have different authority, owners, lifecycle, or reading paths;
- merge artifacts when one coherent read is shorter and duplicate ownership disappears;
- do not split merely because a document is mature or long.

## Migration Rules

1. Check inbound references before moving or deleting.
2. Move by semantic role, not filename or age.
3. Update the closest README/index in the same change.
4. Keep one current home for each meaning.
5. Preserve source/evidence context before deleting candidate prose.
6. Keep host language policy intact.
7. Treat generated review signals as inputs to judgment, not automatic file moves.

## Deletion Rules

Delete when all are true:

- the content is superseded or no longer changes decisions;
- no current or accepted artifact depends on it as evidence or source;
- useful context has been linked elsewhere;
- retaining it would make a reader choose the wrong route.

Retain or escalate when legal, security, release-history, compliance, or irreversible data risk applies.

## Cleanup Output

```text
kept:
promoted:
demoted:
partitioned:
flattened:
merged:
split:
converted_to_source:
deleted:
indexes_updated:
temporary_bridges:
verification:
unresolved_decisions:
```
