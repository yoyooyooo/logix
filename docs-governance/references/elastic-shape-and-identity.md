# Elastic Shape and Identity

Top-level semantic layers are stable. Their internal shape and identity machinery are earned.

## Three Admission Gates

Treat these as independent decisions:

| Gate | Question | Default |
|---|---|---|
| Layer admission | Does this content require a new authority role under `docs/`? | keep it in an existing layer |
| Partition admission | Does one layer need a child directory? | keep the layer flat |
| Identity admission | Does an artifact need metadata or a formal identifier? | use its semantic path |

A project may pass one gate without passing the others.

## Earned Partitioning

Evolution path:

```text
flat files
  -> one earned child partition
  -> several asymmetric domain partitions
  -> deeper local classification only where an independent boundary exists
```

A flat layer is a complete, healthy structure:

```text
docs/ssot/
├── README.md
├── product-language.md
├── platform.md
├── audit.md
└── investigation.md
```

A mixed structure is also healthy:

```text
docs/ssot/
├── README.md
├── product-language.md
├── platform.md
├── investigation.md
└── audit/
    ├── README.md
    ├── domain-and-lifecycle.md
    └── permissions-and-rules.md
```

Only the area that earned a partition should receive one. Structural symmetry is not a governance objective.

## Strong Partition Signals

One strong signal may be sufficient:

- independent business or technical ownership;
- different confidentiality, access, retention, or archival policy;
- independent authority conflict or review process;
- independently released or governed nested project;
- generated or external contract material that must be isolated from narrative docs.

## Navigation-pressure Signals

Usually require at least two durable signals:

- three or more long-lived artifacts form a coherent topic cluster;
- repeated filename prefixes expose a stable cluster;
- distinct reader groups repeatedly need different entry paths;
- the parent README can no longer route the layer concisely;
- two or more stable content clusters have different change cadence;
- most internal links stay within one local subset.

Counts are review signals, not automatic migration authority.

## Partition Rules

- Child directories inherit the parent layer's authority.
- Keep shared artifacts at the layer root.
- Prefer one organizational axis per nesting level.
- Domain-first and artifact-type-first trees should not compete at the same level.
- A mature document may remain one file when it is still the shortest coherent reading unit.
- A child README is a local router, not a second layer contract.
- Empty taxonomies and single-file directories require a real non-volume boundary.
- Flatten or merge a partition when it no longer reduces ambiguity.
- Move files only after updating inbound links and the nearest indexes.

## Identity Admission

Identity exists to make references stable, not to make a repository look formal.

### Level 0 — Semantic Path

Default:

```text
docs/product/product-brief.md
docs/features/audit-management.md
docs/ssot/audit.md
```

The path is the identity. This is enough for most narrative and authority docs.

### Level 1 — Stable Semantic Key

Add only when tools or cross-document references need a rename-resistant key:

```yaml
---
key: audit-management
---
```

Keys must be unique in their declared scope. They are optional, not universal frontmatter.

### Level 2 — Sequential Collection ID

Use for append-only collections where order and immutable citation matter, such as ADRs:

```text
0001-adopt-monorepo.md
0002-separate-runtime-boundaries.md
```

Do not add sequential IDs to ordinary files merely for sorting.

### Level 3 — Atomic Traceability ID

Add requirement, rule, acceptance, control, or test IDs only when the project has a real traceability chain across reviews, contracts, tests, UAT, releases, or regulated evidence.

Start with the thinnest scheme that is unique and stable. Do not encode mutable hierarchy into IDs.

## Artifact Graph Identity

`node_id` is opt-in graph metadata. It is not the universal document ID and does not replace semantic paths, requirement IDs, or database business numbers.

Use it only when an artifact participates in graph navigation or relation auditing. See [Artifact Graph](artifact-graph.md).

## Optional Project Hints

A repository may declare preferences without declaring a fixed tree:

```yaml
structure:
  strategy: earned
  preferred_max_depth: 2
  child_readme_threshold: 5
  repeated_prefix_hint_threshold: 3

identity:
  default: semantic-path
  graph_metadata: opt-in
  sequential_collections:
    - adr
  atomic_ids: when-traceability-needed
```

These are review thresholds, not automatic file-move rules.

## Audit Semantics

Review-oriented findings:

```text
DOCS_REPEATED_PREFIX_CLUSTER
DOCS_SINGLE_ARTIFACT_PARTITION
DOCS_EMPTY_PARTITION
DOCS_DEEP_PARTITION_REVIEW
DOCS_MIXED_AXIS_REVIEW
DOCS_CHILD_README_MISSING
DOCS_REDUNDANT_CHILD_AUTHORITY
```

Blocking findings remain narrow:

```text
duplicate current authority
duplicate explicit identity
broken current entry route
shadow authority layer
```

Scripts detect pressure. Agents and humans decide structure.
