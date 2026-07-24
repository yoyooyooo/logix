# Artifact Graph

The artifact graph is an opt-in navigation inventory. It is useful when a repository has enough candidate, source, goal, report, spec, or roadmap artifacts that direct links no longer provide a small current view.

## Doctrine

```text
human writes intent
agent judges durable relations
YAML frontmatter stores minimal graph metadata
scripts generate views and hygiene findings
```

The graph does not own product truth, requirement identity, execution progress, or automatic scheduling.

## Admission

Add graph metadata only when at least one is true:

- the artifact participates in cross-method navigation;
- readiness/blocker review needs explicit relations;
- source/evidence lineage is hard to discover from direct links;
- generated current views materially reduce reading cost.

Ordinary Product, SSoT, Architecture, Design, or PRD files may remain outside the graph.

## Minimal Frontmatter

```yaml
---
node_id: web-channel-projection-verification
artifact_type: goal
status: open-candidate
---
```

`node_id` must be unique across scanned roots. It is not a universal document ID.

Suggested broad types:

```text
seed proposal source brief goal plan report roadmap spec
```

Suggested statuses:

```text
weak-signal open-candidate bridge-needed ready active completed blocked retired
```

Projects may extend these only with a declared local schema.

## Optional Relations

```yaml
depends_on:
blocks:
unblocks:
bridges_to:
related_to:
supersedes:
source_material:
evidence:
```

Hard edges require semantic judgment. Use `related_to` or omit the edge when the relation is uncertain.

## Separation of Identities

```text
semantic path        -> ordinary document identity
doc key              -> optional rename-resistant reference
sequential ID        -> append-only collection citation
requirement/control ID -> atomic traceability
node_id              -> optional graph node identity
business number      -> runtime/domain identity
```

Do not force these into one scheme.

## Audit Limits

The graph scanner detects duplicate IDs, unknown relation targets, and malformed opt-in metadata. It does not infer readiness, promote artifacts, cascade statuses, or claim that declared relations are semantically correct.
