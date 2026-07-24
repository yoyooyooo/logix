#!/usr/bin/env python3
from __future__ import annotations

import json
import py_compile
import shutil
import subprocess
import sys
import tempfile
import textwrap
import zipfile
from pathlib import Path

FILES: dict[str, str] = {
    "SKILL.md": r'''---
name: docs-governance
description: >-
  Converges repository documentation into one authority chain with earned internal shape. Use when creating, restructuring, auditing, or cleaning docs/*; resolving Product, SSoT, Standards, ADR, Architecture, Roadmap, protocol, evidence, and implementation-spec boundaries; separating current authority from future candidates; preserving source backlinks; or reviewing links, indexes, lifecycle, source alignment, partition pressure, and adaptive document identity.
---

# Docs Governance

Converge documentation toward one current authority chain and one explicit future route. **Earned shape** is the structural rule: semantic layers stay stable; subdirectories, IDs, and traceability appear only when they remove real ambiguity.

## Operating Contract

```text
Owns:
  docs layer boundaries, placement, current/future classification,
  internal-shape review, identity policy, retention, indexes,
  source-code alignment audit and docs cleanup.

Does not own:
  product semantics, tracker/spec/execution progress or evidence state,
  implementation completion, legal retention decisions,
  or public protocol/security decisions.

Stop when:
  the highest authority is ambiguous, deletion risks unlinked evidence,
  or resolution requires a new product/security/public-contract decision.
```

## Workflow

1. Read `AGENTS.md`, `docs/README.md`, the relevant layer README, and the nearest host policy.
2. Classify every affected claim as `current-fact`, `current-binding`, `future-candidate`, `active-proof`, or `historical-evidence`.
3. Place each meaning under one semantic owner; keep one current home.
4. Apply **earned shape** inside that layer: start flat, partition only for a durable boundary or accumulated routing pressure, and add identity only at the traceability level actually needed.
5. Before move, split, flatten, archive, or delete, assign lifecycle and retention verdicts and preserve source/evidence backlinks.
6. Update the nearest README/index, conflict behavior, promotion/demotion route, and source anchors in the same change.
7. Run the deterministic audits and report blockers, warnings, deliberate exceptions, and unverified claims.

Completion requires every affected claim to have one class and owner; current, future, active proof, and history to remain distinguishable; every moved or removed artifact to have a retention/link disposition; every structural change to have an earned rationale; and every available audit to have run.

## Placement

```text
current product meaning                -> docs/product/**
detailed user-facing requirement       -> docs/features/** when the project needs it
current object/fact authority           -> docs/ssot/**
current executable rule/check/command   -> docs/standards/**
adopted technical tradeoff              -> docs/adr/**
current topology / accepted seam        -> docs/architecture/**
wire schema/profile/media type          -> docs/protocols/**
UI/UX/visual behavior                   -> docs/design/**
future sequence/gate/capability capsule -> docs/roadmap/**
active work/progress/evidence            -> configured tracker/spec/evidence method
past audit/delivery/validation           -> docs/reports/**
implementation checklist                -> root specs/** or owning execution artifact
```

## Earned Shape

A top-level layer is a semantic contract, not a mandatory taxonomy. Keep it flat until navigation, ownership, security, retention, lifecycle, or reader boundaries justify a partition. Mixed depth and asymmetric domains are valid. Child directories inherit parent authority. Semantic paths are the default identity; graph metadata, sequential records, and atomic requirement IDs are opt-in.

## Future Rule

`docs/roadmap/future/<capability>/README.md` is an active route, not current authority. It may describe candidate product and architecture rigorously, but it does not recreate `future/ssot`, `future/standards`, or other shadow authority trees. Promotion moves accepted authority into formal layers and shrinks the capsule to the remaining future delta.

## Required Reading

- Layer placement and conflict behavior: [Docs Layer Model](references/docs-layer-model.md)
- Flat-first partitioning and adaptive identity: [Internal Shape and Identity](references/internal-shape-and-identity.md)
- Current, future, proof, and history: [Current vs Future](references/current-vs-future.md)
- Roadmap capsules and promotion: [Roadmap and Future Capsules](references/roadmap-and-future-capsules.md)
- Source/docs bidirectional alignment: [Source-Code Alignment](references/source-code-alignment.md)
- Retention, migration, flattening, and deletion: [Lifecycle and Cleanup](references/lifecycle-cleanup.md)
- Human-agent operating flow: [Human-Agent SOP](references/human-agent-sop.md)
- Opt-in frontmatter relations: [Artifact Graph](references/artifact-graph.md)

## Deterministic Audit

```bash
python3 scripts/run_docs_audit.py --repo <repo>
python3 scripts/scan_docs_agent_readability.py --repo <repo>
python3 scripts/scan_future_capsules.py --repo <repo>
python3 scripts/scan_docs_links.py --repo <repo>
python3 scripts/scan_source_doc_anchors.py --repo <repo>
python3 scripts/artifact_graph.py audit --repo <repo>
```

The scripts surface structural pressure; they do not move files or invent semantic boundaries.

## Output

```text
classification table
placement/retention decisions
shape and identity decisions
moves/splits/merges/flattening/deletions
source/evidence backlinks
index/link updates
audit results and unresolved decisions
```

A docs-only pass may claim documentation convergence and static consistency. It may not claim compile, test, migration, browser, runtime, or production success without corresponding evidence.
''',
    "agents/openai.yaml": r'''interface:
  display_name: "Docs Governance"
  short_description: "Converge docs authority with earned internal shape"
  default_prompt: "Use $docs-governance to converge docs/* authority layers, classify current/future/proof/history, preserve roadmap and evidence value, keep layer internals flat until partitions are earned, use adaptive document identity, audit source alignment, links, indexes and lifecycle, and produce a safe migration or cleanup plan."
''',
    "evals/evals.json": r'''{
  "skill_name": "docs-governance",
  "evals": [
    {
      "id": 1,
      "prompt": "I am starting a new TypeScript SaaS repo for long-term AI coding. Design the docs/* top-level folders and explain where roadmap, ADRs, proposals, implementation specs, API docs, and evidence should live.",
      "expected_output": "Defines project-agnostic semantic layers, creates only a thin baseline, keeps implementation specs outside docs/*, and states owns, must-not-own, conflict and lifecycle boundaries."
    },
    {
      "id": 2,
      "prompt": "This repo has docs/next, docs/review-plan, docs/superpowers/results, docs/specs, and specs/. Decide what should be migrated, deleted, or kept so agents stop using old planning paths.",
      "expected_output": "Classifies lifecycle and retention, preserves linked evidence, migrates by semantic role, updates indexes, and avoids duplicate current homes."
    },
    {
      "id": 3,
      "prompt": "We have a wire protocol with JSON Schema and canonical examples. Should it live under docs/specs, docs/protocols, standards, or root specs?",
      "expected_output": "Routes adopted wire contracts to docs/protocols, executable implementation plans to root specs, and enforceable command/rule discipline to standards."
    },
    {
      "id": 4,
      "prompt": "A recent cleanup deleted product-evolution-sequence.md because none of its stages are implemented. Should it stay deleted?",
      "expected_output": "Rejects mechanical deletion when the document still constrains sequence or promotion gates, while keeping implementation progress in the selected tracker/spec/evidence owner."
    },
    {
      "id": 5,
      "prompt": "We want docs/roadmap/future/ssot, future/standards, future/adr and future/architecture so future design can be rigorous. Design the structure.",
      "expected_output": "Rejects shadow authority layers and proposes capability-oriented future capsules with candidate rigor, prerequisites, falsifier and promotion targets."
    },
    {
      "id": 6,
      "prompt": "Audit our current SSoT and Architecture after a major source refactor. Some docs describe objects that no longer exist; code also has a new public authority object with no docs owner.",
      "expected_output": "Performs bidirectional source/docs alignment, demotes unsupported claims, repairs current owners and code anchors, and reports unverified product meaning without inventing it."
    },
    {
      "id": 7,
      "prompt": "An Interaction Kernel design is useful long term, but current code only has three smaller coordination seams. Where should each part live?",
      "expected_output": "Keeps current bindings and implemented seams in current authority layers, moves the complete unimplemented model to a future capability capsule, and preserves a falsifiable promotion gate."
    },
    {
      "id": 8,
      "prompt": "Our docs/ssot has README.md, platform.md, billing.md and identity.md. Please create glossary/, domain/, states/, rules/, permissions/ and metrics/ so the structure looks mature.",
      "expected_output": "Keeps the layer flat because no durable partition pressure exists, explains that maturity is not directory depth, and records possible future partition signals without pre-creating empty taxonomy."
    },
    {
      "id": 9,
      "prompt": "Only the billing domain has grown into six independently maintained authority documents; identity and platform remain one file each. Must all domains use matching subdirectories?",
      "expected_output": "Allows a mixed asymmetric shape, partitions billing only if the boundary is durable, keeps shared artifacts at the layer root, and updates local navigation without forcing symmetry."
    },
    {
      "id": 10,
      "prompt": "Give every product, SSoT and architecture document a project-prefixed sequence number and every paragraph a requirement ID before we have any test or UAT traceability.",
      "expected_output": "Uses semantic paths by default, reserves optional keys for stable cross-document references, sequence IDs for append-only collections, and atomic IDs for actual traceability pressure."
    },
    {
      "id": 11,
      "prompt": "A layer contains audit-overview.md, audit-states.md, audit-rules.md, audit-permissions.md and three unrelated shared files. Automatically move the audit files into a folder.",
      "expected_output": "Treats repeated prefixes as a review signal, reads the artifacts and ownership/navigation context, proposes a partition only after semantic judgment, and never auto-moves from a filename heuristic."
    },
    {
      "id": 12,
      "prompt": "A child folder README repeats Owns, Must Not Own and conflict priority from its top-level layer. Is that the safest setup?",
      "expected_output": "Explains inherited authority, trims the child README to scope, contents, read-next and genuine local exceptions, and preserves one authority contract at the top-level layer."
    }
  ]
}
''',
    "references/docs-layer-model.md": r'''# Docs Layer Model

This reference defines project-agnostic top-level `docs/*` layers for long-running human-agent development. A project may omit layers it does not need. If a layer exists, keep its semantic boundary strict and let its internal shape be earned.

## Root Rule

```text
docs/<layer> = durable semantic owner
docs/<layer>/<partition> = optional routing boundary earned inside that owner
docs/<layer>/<partition>/<detail> = free-form only while it reduces ambiguity
```

A folder name below a layer does not create another authority chain. See [Internal Shape and Identity](internal-shape-and-identity.md) before adding nested taxonomy or broad numbering.

## Top-level Layer Admission

Create a direct child under `docs/` only when all are true:

- the name describes a durable document type, not a phase, feature, team, tool, temporary inbox, or personal habit;
- it has a different highest authority from existing layers;
- a future agent can infer placement from the name without knowing the current roadmap;
- it can state `Owns`, `Must Not Own`, conflict behavior, and promotion/demotion path;
- keeping the content inside an existing layer would create durable ambiguity.

File volume alone does not earn a new top-level layer.

## Canonical Vocabulary

Use one canonical name for each layer. Avoid singular/plural pairs and synonyms for the same document type.

```text
Core: docs/product, docs/ssot, docs/standards, docs/adr,
      docs/architecture, docs/roadmap
Idea flow: docs/goal-proof, docs/proposals, docs/research, docs/reports
Product/interface: docs/features, docs/design, docs/interface-capabilities,
                   docs/product-harness
Contracts/ops: docs/protocols, docs/api, docs/runbook, docs/security,
               docs/data, docs/evals, docs/releases
```

Specialized layers are optional. Add them only when they carry recurring authority that would otherwise overload an existing layer.

## Layer Boundaries

| Layer | Owns | Must not own |
|---|---|---|
| `docs/product/**` | Product meaning, users, value, principles, non-goals, capability intent | Implementation status, detailed work items, source truth |
| `docs/features/**` | Detailed user-facing requirements, scenarios and acceptance scope when a project needs a dedicated requirement layer | Cross-domain fact authority, implementation plans |
| `docs/ssot/**` | Current domain terms, invariants, objects, state semantics and shared facts | Future complete models, UI prose, work tracking |
| `docs/standards/**` | Current executable rules, commands, checks and contribution discipline | Aspirational guidance with no current application path |
| `docs/adr/**` | Adopted technical tradeoffs, alternatives and consequences | Product scope decisions, rolling implementation progress |
| `docs/architecture/**` | Current topology, module boundaries, accepted seams and runtime composition | Product meaning, task breakdowns, unadopted future systems |
| `docs/roadmap/**` | Long-horizon sequence, prerequisites, gates and future capability routes | Current fact authority or step-by-step execution status |
| `docs/proposals/**` | Open alternatives and decision material | Accepted authority or hidden backlog status |
| `docs/research/**` | Exploratory findings and external source synthesis | Current authority or delivery completion |
| `docs/reports/**` | Past audit, experiment, migration, delivery and validation evidence | Current truth merely because it is recent |
| `docs/protocols/**` | Adopted cross-boundary schemas, media types, profiles, canonical examples and conformance inputs | Internal implementation plans |
| `docs/api/**` | Human-facing endpoint and SDK usage | A second machine contract when generated schemas own it |
| `docs/design/**` | Information architecture, interaction, visual behavior and design-system guidance | Product scope or backend implementation truth |
| `docs/runbook/**` | Operational procedures, incident response, deployment and rollback playbooks | Architecture decisions or roadmap sequence |
| `docs/security/**` | Threat models, security policy, permission models and security review evidence | General product requirements unless security-specific |
| `docs/data/**` | Dataset contracts, lineage, metric semantics and retention definitions | General database implementation work items |
| `docs/evals/**` | Evaluation suites, rubrics, benchmark definitions and reports | Unit-test implementation detail |
| `docs/releases/**` | Release notes, rollout evidence and compatibility notices | Roadmap planning or active work items |

Product and Features may remain one layer in a small project. Split them only when detailed requirements repeatedly overload durable product meaning and each layer can maintain a distinct authority boundary.

## Root Implementation Artifacts

Root `specs/**` is not `docs/specs/**`.

Use root implementation artifacts for executable implementation specs, file-level work items, trace items, checklists, local evidence and handoffs. Prefer sharp document homes:

```text
docs/protocols/**  adopted wire contracts
docs/product/**    durable product meaning
docs/features/**   detailed user-facing requirements when needed
root specs/**       executable implementation slices
```

## Conflict Behavior

A useful default when asking what is true now is:

```text
docs/ssot/**
  -> docs/standards/**
  -> code + tests + generated evidence
  -> docs/adr/**
  -> docs/protocols/** for wire compatibility
  -> docs/architecture/**
  -> docs/product/** / docs/features/** for user-facing meaning
  -> docs/roadmap/**
  -> docs/proposals/** / docs/research/**
  -> historical reports and external notes
```

This is not a universal linear priority. Ask the owning question: product intent, current runtime behavior, domain meaning, executable rule, wire compatibility, or historical evidence may each have a different highest authority. `docs/README.md` should state project-specific exceptions.

## Layer README Contract

Every durable top-level layer should have a `README.md` naming:

- `Owns`;
- `Must Not Own`;
- current entry points or `Read Next`.

Authority-heavy layers should also state conflict behavior, promotion/demotion, and evidence retention where relevant.

A child partition inherits this contract. Its README is earned by local navigation pressure and normally contains only `Scope`, `Contents`, `Read Next`, and genuine local exceptions. Repeating a second `Owns` / `Must Not Own` chain creates drift.

## Host Language

Before creating or rewriting durable docs, read `AGENTS.md`, `docs/README.md`, the layer README and the nearest policy. Follow the host narrative-language rule for prose while preserving canonical machine fields, commands, paths, schemas and code symbols where stable English improves interoperability.
''',
    "references/internal-shape-and-identity.md": r'''# Internal Shape and Identity

**Earned shape** keeps documentation proportional to the boundaries that actually exist. Stable semantic layers are mandatory; nested taxonomy and identifier machinery are optional adaptations.

## Three Admission Gates

Treat these as independent decisions:

| Gate | Question | Default |
|---|---|---|
| Layer admission | Does a new `docs/<layer>` need a distinct highest authority? | Reuse an existing layer |
| Partition admission | Does a layer need a child directory? | Keep the layer flat |
| Identity admission | Does an artifact or statement need an ID beyond its path? | Use the semantic path |

Passing one gate does not pass the others.

## Flat First

Healthy initial shape:

```text
docs/ssot/
├── README.md
├── platform.md
├── billing.md
└── identity.md
```

This is a permanent valid structure, not a temporary stage. Maturity is measured by clear authority and usable routing, not directory depth.

## Partition Signals

### Strong boundaries

One strong signal may justify a partition even with few files:

- independent owner or approval path;
- distinct confidentiality, access, retention or legal treatment;
- separate authority conflict rules;
- independently released or governed nested project;
- generated or external contract material that must be isolated from narrative docs.

### Accumulated routing pressure

Usually require more than one weaker signal:

- three or more durable artifacts form a stable semantic cluster;
- repeated filename prefixes expose a real domain boundary;
- different readers repeatedly need different entry paths;
- the parent README cannot remain a concise router;
- two or more stable content clusters change at different rates;
- most links and maintenance work stay inside one local cluster.

Counts and prefixes are review signals, never migration authority.

## Valid Shapes

Flat:

```text
docs/ssot/
├── README.md
├── platform.md
├── billing.md
└── identity.md
```

Mixed and asymmetric:

```text
docs/ssot/
├── README.md
├── platform.md
├── identity.md
└── billing/
    ├── README.md
    ├── domain-and-lifecycle.md
    └── permissions-and-rules.md
```

More detailed only after independent maintenance boundaries emerge:

```text
docs/ssot/billing/
├── README.md
├── domain-model.md
├── states-and-transitions.md
├── roles-and-permissions.md
└── shared-rules.md
```

One domain earning a directory does not force sibling symmetry.

## Organizing Axis

Prefer one axis per nesting level. If a layer is partitioned by domain:

```text
ssot/billing/states.md
ssot/identity/states.md
```

avoid simultaneously creating a competing artifact-type route:

```text
ssot/states/billing.md
ssot/billing/permissions.md
```

Keep truly shared artifacts at the layer root.

## Child README

A child README normally owns navigation, not authority:

```text
Scope
Contents
Read Next
Local Exceptions, only when real
```

It inherits the top-level layer's `Owns`, `Must Not Own`, and conflict behavior. Declare a separate authority contract only for a genuine nested project boundary.

## Partition Change Protocol

Before partitioning or flattening:

1. Read the affected artifacts; infer no boundary from names alone.
2. Name the durable boundary or accumulated pressures.
3. Choose one organizing axis and the shallowest useful depth.
4. Move shared material to the nearest shared owner.
5. Update inbound links, the parent router and any local README in the same change.
6. Run link, readability and baseline audits.
7. Record deliberate exceptions when a heuristic warning remains valid.

Flatten a partition when it no longer shortens routing, separates ownership, or protects a real boundary.

## Adaptive Identity

Identity should match traceability pressure.

### L0 — semantic path

Default for ordinary Product, SSoT, Architecture, Standards and Design docs:

```text
docs/product/product-brief.md
docs/ssot/billing.md
docs/architecture/current-system.md
```

The path is unique, stable enough and human-readable.

### L1 — semantic key

Add an optional stable key when artifacts are moved or referenced across many systems:

```yaml
---
key: billing-lifecycle
---
```

A key is not mandatory frontmatter for every document.

### L2 — sequential collection

Use monotonic numbering for append-only records whose order and citation matter, such as ADRs:

```text
0001-adopt-postgresql.md
0002-separate-control-plane.md
```

Do not renumber or reuse retired numbers. Product decisions may remain one decision log until independent citation, approval or supersession pressure earns a collection.

### L3 — atomic traceability

Add requirement, rule or acceptance IDs only when statements must connect across PRDs, tests, UAT, contracts, change control or releases:

```text
BILL-FR-01
BILL-RULE-03
BILL-AC-02
```

Do not number prose merely to look complete.

## Artifact Graph Boundary

`node_id` is opt-in metadata for artifacts participating in the lightweight planning/evidence graph. It is not a universal document ID, requirement ID, database business number or replacement for semantic paths.

```text
document path ≠ node_id ≠ requirement ID ≠ business record number
```

## Optional Project Preference

A repository may publish non-binding defaults without prescribing a tree:

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
  requirement_ids: when-traceability-needed
```

These values guide review heuristics. They do not authorize automatic moves or ID generation.
''',
    "references/current-vs-future.md": r'''# Current vs Future Classification

## Purpose

Keep current authority aligned with evidence while preserving rigorous long-horizon thinking.

## Five Classes

### Current Fact

Exists in an authoritative present surface: product behavior, source/domain type, schema/migration, adopted contract, real command/query path, or test/runtime evidence exercising current code. A fixture alone does not prove user-facing availability.

### Current Binding

An adopted constraint that already governs present work even when a larger capability is incomplete. It belongs in the current semantic owner and must state implementation limits honestly.

### Future Candidate

A product hypothesis, complete future object model, unadopted protocol, quality target or deployment shape that is not current authority. Put durable candidates in a Roadmap capability capsule; keep weaker material in the project's proposal or idea-flow owner.

### Active Proof

A selected slice currently being implemented or validated. The configured tracker/spec/evidence method owns objective, progress, evidence, claim ceiling and completion review. Roadmap links to that owner rather than copying status.

### Historical Evidence

Past delivery, audit, experiment, rejected design source or immutable proof record. Keep it in Reports or the selected evidence/source owner and never present it as current truth merely because it is recent.

## Decision Test

Ask in order:

1. Can a user or code path rely on this today?
2. Does current implementation already have to obey it?
3. Has the tradeoff or contract been adopted?
4. Is it only a future possibility or target?
5. Is it active work/evidence or past evidence?

When uncertainty remains, preserve the source and record `decision-needed`; do not promote the claim.

## Mixed Documents

Mixed current and future material is acceptable only when the layer supports it and the boundary is explicit.

Allowed:

```text
Architecture: current topology plus a clearly labeled accepted seam.
ADR: accepted decision plus implementation_status: partial.
Product: stable north star plus explicit not-current availability.
```

Split when future detail becomes a second model readers could mistake for current authority.

Disallowed:

```text
SSoT containing an entire unimplemented object graph.
Standard with no current command, check or applicable path.
Protocol called canonical before adoption.
Report presented as current truth.
```

Documentation alignment establishes terminology and ownership, not implementation completion.
''',
    "references/roadmap-and-future-capsules.md": r'''# Roadmap and Future Capability Capsules

## Roadmap Owns

```text
long-horizon product evolution sequence
capability prerequisites and promotion gates
current launch or coverage gates
future capability routes
links to owning execution and evidence artifacts
```

Roadmap does not own step-by-step implementation, current object authority or copied tracker status.

## Preserve Route Value

Retain a Roadmap even when unimplemented if it still constrains order, prevents unsafe early work, defines a falsifiable promotion gate, links current foundations to a future objective, or is referenced by an active route.

## Capability Capsule

Preferred home:

```text
docs/roadmap/future/<capability>/README.md
```

This capability directory is a deliberate exception to flat-first organization: the capsule itself is the unit of future routing. It remains shallow and capability-oriented.

Do not recreate authority layers below `future/`:

```text
docs/roadmap/future/ssot
docs/roadmap/future/standards
docs/roadmap/future/adr
docs/roadmap/future/architecture
docs/roadmap/future/product
docs/roadmap/future/protocols
```

## Capsule Questions

A durable capsule should answer:

```text
Product Hypothesis
Candidate Capability Boundary
Reusable Current Foundations
Current Non-authority
Candidate Authority Model
Candidate Architecture
Prerequisites
Promotion Gates
First Falsifiable Proof
Forbidden Early Implementations
Promotion Targets
Sources And Evidence
```

Use `templates/future-capability-capsule.md`.

## Promotion

When a candidate becomes active work, link its owning tracker/spec/evidence artifact instead of copying progress into Roadmap. When proof and adoption succeed:

1. move accepted meaning, facts, decisions, architecture, rules or contracts into their formal current layers;
2. update indexes and backlinks;
3. remove duplicated promoted text from the capsule;
4. keep only the remaining future delta and route value.

A capsule may participate in the Artifact Graph with `authority_scope: future-candidate`; graph relations express navigation and gates, not scheduling or current authority.
''',
    "references/source-code-alignment.md": r'''# Source-Code Alignment

Use bidirectional alignment when current Product, SSoT, Standards, Architecture, Protocols or API docs may have drifted from source, schemas, tests or generated contracts.

## Two Directions

### Docs to source

For each current claim, locate the authoritative implementation or evidence anchor:

```text
public type or domain object
schema or migration
command/query path
runtime composition
contract/schema/example
checker or test
```

If no anchor exists, classify the claim as current-binding with an explicit implementation gap, future-candidate, decision-needed, or stale history. Do not leave unsupported availability language.

### Source to docs

For each public authority object, adopted seam, persisted state, command surface or stable contract, identify its documentation owner. Report missing ownership; do not infer product meaning from a code symbol alone.

## Alignment Matrix

For substantial convergence, produce:

| Claim | Class | Docs owner | Source/evidence anchor | Gap |
|---|---|---|---|---|
| ... | current-fact/current-binding/future-candidate | ... | ... | ... |

## Common Drift

```text
source object exists, docs omit authority owner
SSoT describes a deleted object
Architecture presents a library seam as production composition
Product says available when only a fixture exists
Standard has no current checker or command
Roadmap copies tracker status
Report or source is cited as current truth
future capsule repeats formal authority after promotion
```

## Source Anchors

Use repository-relative paths and, where useful, stable symbol names. Avoid brittle line numbers as the only anchor. Label example and future paths explicitly so mechanical scans do not treat them as missing current source.

## Claim Ceiling

A docs-only pass may claim documentation convergence and static source/doc consistency. Runtime behavior, migrations, browser flows and production state require executed evidence.
''',
    "references/lifecycle-cleanup.md": r'''# Lifecycle and Cleanup

Use this reference for new repositories, lightweight docs, migrated planning folders, dense mature layers and periodic cleanup. Initialization and cleanup are the same convergence loop with different amounts of material.

## Convergence Loop

```text
inspect current material
  -> classify claim and layer state
  -> keep/create only thin routing structure
  -> promote authority
  -> demote candidates
  -> partition or flatten only when earned
  -> bridge gaps
  -> archive converted source
  -> delete obsolete material
  -> update nearest indexes and links
  -> run audit
```

## Lifecycle States

| State | Meaning | Default action |
|---|---|---|
| `missing-baseline` | Needed routing or authority entry is absent | Create the thinnest host-appropriate README or template |
| `active-authority` | Current truth, decision, rule or contract | Keep in the owning formal layer |
| `active-route` | Current or long-horizon sequence or gate | Keep in Roadmap while route value remains |
| `future-capability` | Durable candidate with prerequisites and promotion target | Keep in a capability capsule |
| `candidate-material` | Still under evaluation | Keep in the selected proposal/idea-flow owner |
| `decision-needed` | Authority conflict requires a higher-level choice | Record in the closest decision queue or proposal |
| `bridge-needed` | Routing or authority transition is missing | Add the thinnest bridge or hand off to the execution method |
| `converted-source` | Consumed by authority, plan, report or evidence | Preserve a backlink, then archive or delete by retention rule |
| `historical-evidence` | Immutable audit, experiment or delivery proof | Keep in Reports/evidence owner |
| `stale-duplicate` | Repeats a newer current owner | Merge useful context, repair links, remove duplicate |
| `mispartitioned` | Directory depth or taxonomy no longer reduces ambiguity | Flatten or regroup around the real boundary |

## Staleness Signals

Review an artifact when it:

- describes a replaced folder scheme or workflow;
- repeats a rule now owned by SSoT, Standards, ADR or Protocols;
- claims completion without evidence;
- keeps candidate material open after promotion;
- copies active status from the tracker/spec/evidence owner;
- records a meeting narrative with no durable decision;
- uses phase wording as current implementation authority;
- cannot answer why a future agent must read it;
- makes readers choose between old and new homes;
- keeps a single-file or empty partition with no real boundary;
- repeats a top-level authority contract in a child README.

## Migration Rules

1. Check inbound references before moving or deleting.
2. Preserve source and evidence backlinks.
3. Move by semantic role, not filename.
4. Name the earned partition or flattening rationale.
5. Choose one organizing axis and the shallowest useful depth.
6. Update the nearest README/index and all links in the same change.
7. Keep one current home for each meaning.
8. Promotion from a future capsule removes duplicated promoted text.
9. Preserve the host narrative-language policy.

## Deletion Gate

Delete only when content is superseded, no current artifact depends on it as evidence, useful source context is linked elsewhere, retention permits removal, and keeping it would route a future agent incorrectly.

## Cleanup Output

```text
kept:
partitioned:
flattened:
moved:
converted_to_source:
deleted:
indexes_updated:
temporary_bridges:
verification:
not_claimed:
```
''',
    "references/human-agent-sop.md": r'''# Human-Agent SOP

## Governance Convergence

Use the same loop for a new repository, a lightly documented project, a migrated tree or a mature cleanup:

```text
read host policy
  -> inventory affected artifacts
  -> classify claims and lifecycle
  -> place under one semantic owner
  -> apply earned shape and adaptive identity
  -> preserve backlinks and retention
  -> update routers
  -> audit
```

A new repository normally needs only:

```text
AGENTS.md or host equivalent
docs/README.md
docs/ssot/README.md when shared fact authority exists
docs/standards/README.md when executable contribution rules exist
docs/adr/README.md and _template.md when decisions are recorded
```

Add Product, Features, Architecture, Roadmap, Protocols, Design, Reports or other layers only when their artifact type exists. Do not pre-create empty taxonomies inside them.

## Read Before Writing

Default route:

```text
AGENTS.md
docs/README.md
relevant top-level layer README
target artifact and its direct references
```

Read a child README only when the target is inside that partition. Extract the host language rule before writing narrative prose.

## Place and Shape

Ask:

- What kind of claim is this?
- Which layer owns that meaning?
- Is it current authority, future candidate, active proof or history?
- Can the layer stay flat?
- What durable boundary or accumulated pressure would a partition solve?
- Does the path already provide enough identity?

A filename cluster prompts semantic review; it does not authorize an automatic move.

## Planning Method Handoff

This skill owns docs-layer placement, authority conflict, internal shape, index coverage, retained-evidence risk and cleanup. The repository's selected planning/execution method owns objective, work items, progress, evidence and completion.

When a project explicitly uses Goal Proof System, `$goal-proof` owns its inbox/source/Goal Pack lifecycle, Goal relations and evidence-backed completion. This skill only routes those artifacts into the wider docs authority model.

## Decision Queue

When authority or placement needs a higher-level choice, record it rather than burying it in prose:

```text
id:
source_artifacts:
conflict:
options:
decision_level: product | ssot | standard | adr | roadmap | implementation
owner:
needed_by:
status: open | decided | obsolete
resolution_target:
```

After decision, promote the meaning to its owner, link the chosen execution artifact if any, backlink from source material, and retire duplicate candidate prose.

## Convergence Actions

```text
promote    candidate meaning becomes current authority
demote     useful context remains but loses authority
split      one artifact contains multiple semantic owners
merge      duplicates describe the same meaning
partition  a durable local boundary earns a directory
flatten    a directory no longer improves routing or governance
bridge     an authority or navigation transition is missing
archive    converted material remains as source/evidence
delete     obsolete material has no retention or routing value
block      a genuine higher-authority decision is required
```

## Execution Recipes

Full docs pass:

```text
run_docs_audit
  -> read blockers and high-value warnings
  -> inspect affected artifacts semantically
  -> apply minimal convergence changes
  -> rerun focused scanners
  -> rerun aggregate audit
```

Before implementation:

```text
read Product/Features as applicable
  -> read SSoT/Standards/ADR/Architecture/Protocols
  -> read owning implementation spec
  -> inspect source and tests
```

After implementation:

```text
record evidence in the owning method
  -> update current docs only for proven changes
  -> shrink promoted future delta
  -> repair links/indexes
  -> audit
```

## Report

Always separate:

```text
proven documentation changes
structure and identity rationale
audit results
deliberate exceptions
unresolved decisions
not_claimed implementation/runtime outcomes
```
''',
    "references/artifact-graph.md": r'''# Artifact Graph

The Artifact Graph is an opt-in navigation and review aid for planning, Roadmap, source and evidence artifacts. It is not the universal identity system and not a scheduler.

## Minimum Frontmatter

```yaml
---
node_id: roadmap-future-example
artifact_type: roadmap
status: open-candidate
---
```

Supported node types:

```text
seed proposal source brief goal plan report roadmap
```

Supported statuses:

```text
weak-signal open-candidate bridge-needed ready active completed blocked retired
```

Optional relations:

```text
depends_on
blocks
unblocks
bridges_to
related_to
supersedes
source_material
evidence
```

## Identity Boundary

Add graph metadata only when graph queries or relations provide value. Ordinary Product, SSoT, Standards, Architecture and Design documents may rely on semantic paths alone.

```text
path identity      human and repository routing
node_id            opt-in graph relation identity
requirement ID     cross-artifact test/UAT traceability
business number    runtime domain identity
```

These are distinct namespaces.

## Commands

```bash
python3 scripts/artifact_graph.py scan --repo <repo>
python3 scripts/artifact_graph.py audit --repo <repo>
python3 scripts/artifact_graph.py node <node-id> --repo <repo>
python3 scripts/artifact_graph.py current --repo <repo> --anchor <node-id>
python3 scripts/artifact_graph.py ready --repo <repo>
python3 scripts/artifact_graph.py blockers <node-id> --repo <repo>
python3 scripts/artifact_graph.py consistency --repo <repo>
python3 scripts/artifact_graph.py orphans --repo <repo>
python3 scripts/artifact_graph.py review-list --repo <repo>
python3 scripts/artifact_graph.py mermaid --repo <repo> --anchor <node-id>
```

Write commands are dry-run by default and require `--write`. They only apply caller-supplied mechanical metadata; they do not infer readiness, cascade status or promote semantic authority.

## Orphans

Only nodes with no incoming or outgoing edges are isolated. Roots and leaves with one-sided relations are normal. Completed reports and retired sources are not treated as orphan problems by default.

## Limits

Mechanical frontmatter cannot establish semantic correctness. Use audit and review-list to prioritize an applied pass that reads the artifact, judges lifecycle and authority, and makes the smallest justified edit.
''',
    "templates/future-capability-capsule.md": r'''---
node_id: roadmap-future-<capability>
artifact_type: roadmap
status: open-candidate
authority_scope: future-candidate
objective: <future outcome>
claim_limit: Future candidate only; no current product or implementation claim.
evidence_contract: <evidence required before promotion>
next_action: <smallest safe next route>
---

# <Capability Name>

## Product Hypothesis

## Candidate Capability Boundary

## Reusable Current Foundations

## Current Non-authority

State explicitly what current Product, SSoT and Standards do not promise.

## Candidate Authority Model

## Candidate Architecture

## Prerequisites

## Promotion Gates

## First Falsifiable Proof

## Forbidden Early Implementations

## Promotion Targets

List formal layers that receive accepted authority after proof.

## Sources And Evidence
''',
    "scripts/_docs_common.py": r'''#!/usr/bin/env python3
from __future__ import annotations

import json
import re
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

SKIP_DIRS = {
    ".git", "node_modules", "dist", "build", ".next", ".turbo", ".cache",
    "coverage", "target", ".venv", "venv", "__pycache__", "vendor",
}

FRONTMATTER_RE = re.compile(r"\A---\r?\n(.*?)\r?\n---\r?\n", re.S)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def severity_counts(findings: Iterable[dict[str, Any]]) -> dict[str, int]:
    counts: Counter[str] = Counter(str(item.get("severity", "info")) for item in findings)
    return {
        "blocker": counts.get("blocker", 0),
        "warn": counts.get("warn", 0),
        "info": counts.get("info", 0),
        "total": sum(counts.values()),
    }


def finding(rule: str, severity: str, path: Path | str, summary: str, fix: str, evidence: list[str] | None = None) -> dict[str, Any]:
    path_text = path.as_posix() if isinstance(path, Path) else str(path)
    return {
        "id": f"{rule}::{path_text}",
        "severity": severity,
        "ruleId": rule,
        "path": path_text,
        "summary": summary,
        "evidence": evidence or [path_text],
        "fixHint": fix,
    }


def iter_files(root: Path, suffixes: tuple[str, ...] | None = None):
    if not root.exists():
        return
    for path in sorted(root.rglob("*")):
        if not path.is_file():
            continue
        if any(part in SKIP_DIRS or part.startswith(".") for part in path.relative_to(root).parts[:-1]):
            continue
        if suffixes and path.suffix.lower() not in suffixes:
            continue
        yield path


def parse_scalar(value: str) -> Any:
    value = value.strip()
    if not value:
        return ""
    if value in {"true", "True"}:
        return True
    if value in {"false", "False"}:
        return False
    if value in {"null", "Null", "~"}:
        return None
    if (value.startswith('"') and value.endswith('"')) or (value.startswith("'") and value.endswith("'")):
        return value[1:-1]
    if value.startswith("[") and value.endswith("]"):
        inner = value[1:-1].strip()
        return [] if not inner else [parse_scalar(part) for part in inner.split(",")]
    if re.fullmatch(r"-?\d+", value):
        return int(value)
    return value


def parse_frontmatter(text: str) -> dict[str, Any]:
    match = FRONTMATTER_RE.match(text)
    if not match:
        return {}
    lines = match.group(1).splitlines()
    result: dict[str, Any] = {}
    current_list: str | None = None
    for raw in lines:
        if not raw.strip() or raw.lstrip().startswith("#"):
            continue
        if raw.startswith(("  - ", "- ")) and current_list:
            result.setdefault(current_list, []).append(parse_scalar(raw.split("-", 1)[1]))
            continue
        if raw.startswith((" ", "\t")):
            continue
        if ":" not in raw:
            current_list = None
            continue
        key, value = raw.split(":", 1)
        key = key.strip()
        value = value.strip()
        if not value:
            result[key] = []
            current_list = key
        else:
            result[key] = parse_scalar(value)
            current_list = None
    return result


def as_list(value: Any) -> list[str]:
    if value is None or value == "":
        return []
    if isinstance(value, list):
        return [str(item) for item in value if str(item)]
    if isinstance(value, str) and "," in value:
        return [item.strip() for item in value.split(",") if item.strip()]
    return [str(value)]


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="ignore")


def load_governance_config(root: Path) -> dict[str, Any]:
    defaults: dict[str, Any] = {
        "structure": {
            "strategy": "earned",
            "preferred_max_depth": 2,
            "child_readme_threshold": 5,
            "repeated_prefix_hint_threshold": 3,
        },
        "identity": {
            "default": "semantic-path",
            "graph_metadata": "opt-in",
            "sequential_collections": ["adr"],
            "requirement_ids": "when-traceability-needed",
        },
    }
    json_path = root / ".docs-governance.json"
    yaml_path = root / ".docs-governance.yaml"
    loaded: dict[str, Any] = {}
    if json_path.is_file():
        try:
            loaded = json.loads(read_text(json_path))
        except json.JSONDecodeError:
            loaded = {}
    elif yaml_path.is_file():
        section: str | None = None
        for raw in read_text(yaml_path).splitlines():
            line = raw.split("#", 1)[0].rstrip()
            if not line.strip():
                continue
            if not line.startswith(" ") and line.endswith(":"):
                section = line[:-1].strip()
                loaded.setdefault(section, {})
                continue
            if section and line.startswith("  ") and ":" in line:
                key, value = line.strip().split(":", 1)
                loaded[section][key] = parse_scalar(value)
    for section, values in loaded.items():
        if isinstance(values, dict) and isinstance(defaults.get(section), dict):
            defaults[section].update(values)
        else:
            defaults[section] = values
    return defaults
''',
    "scripts/scan_docs_baseline.py": r'''#!/usr/bin/env python3
"""Scan a repository for the thinnest project-appropriate docs governance baseline."""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from _docs_common import finding, now_iso, read_text, severity_counts

PROJECT_MANIFESTS = {"package.json", "pyproject.toml", "requirements.txt", "Cargo.toml", "go.mod", "pom.xml", "build.gradle", "build.gradle.kts"}
LOCK_FILES = {"pnpm-lock.yaml", "package-lock.json", "yarn.lock", "bun.lock", "poetry.lock", "uv.lock", "Cargo.lock", "go.sum"}
CODE_DIRS = {"src", "app", "apps", "packages", "services", "libs", "crates"}
CODE_EXTENSIONS = {".ts", ".tsx", ".js", ".jsx", ".py", ".rs", ".go", ".java", ".kt", ".swift"}


def _has_project_markers(root: Path) -> bool:
    if any((root / name).exists() for name in PROJECT_MANIFESTS | LOCK_FILES):
        return True
    if any((root / name).exists() for name in CODE_DIRS):
        return True
    return any(path.is_file() and path.suffix.lower() in CODE_EXTENSIONS for path in root.iterdir())


def _product_shaped(root: Path) -> bool:
    return any((root / name).exists() for name in ("app", "apps", "web", "frontend", "ui"))


def _top_layer_readmes(root: Path) -> list[Path]:
    docs = root / "docs"
    if not docs.is_dir():
        return []
    return sorted(child / "README.md" for child in docs.iterdir() if child.is_dir() and not child.name.startswith(".") and (child / "README.md").is_file())


def scan(repo: Path) -> dict:
    root = repo.resolve()
    findings: list[dict] = []
    project = _has_project_markers(root)
    required = ["docs/README.md"]
    if project:
        required += ["docs/ssot/README.md", "docs/standards/README.md", "docs/adr/_template.md"]
    if _product_shaped(root):
        required.append("docs/product/README.md")

    presence = []
    for rel in required:
        ok = (root / rel).is_file()
        presence.append({"path": rel, "status": "present" if ok else "missing"})
        if not ok:
            findings.append(finding(
                "DOCS_BASELINE_MISSING", "warn", rel,
                f"missing project-appropriate docs baseline file: {rel}",
                "create the thinnest routing or authority file; do not pre-create unrelated layers or taxonomies",
            ))

    layer_status = []
    for readme in _top_layer_readmes(root):
        rel = readme.relative_to(root).as_posix()
        text = read_text(readme)
        owns = "## Owns" in text or "## 所有权" in text or "## 负责" in text
        excludes = "## Must Not Own" in text or "## 不负责" in text or "## 不应包含" in text
        entry = any(token in text for token in ("## Read Next", "## Homes", "## 使用方式", "## 下一步阅读", "## 入口"))
        layer_status.append({"path": rel, "owns": owns, "mustNotOwn": excludes, "entry": entry})
        missing = [name for name, ok in (("Owns", owns), ("Must Not Own", excludes), ("Read Next", entry)) if not ok]
        if missing:
            findings.append(finding(
                "DOCS_LAYER_README_CONTRACT", "warn", rel,
                f"top-level layer README is missing: {', '.join(missing)}",
                "state the layer authority boundary and current entry points in this README",
            ))

    report = {
        "version": "v2",
        "scannedAt": now_iso(),
        "repoRoot": str(root),
        "mode": "project-root" if project else "lightweight-or-aggregate",
        "required": presence,
        "layers": layer_status,
        "findings": findings,
    }
    report["summary"] = severity_counts(findings)
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", default=".")
    args = parser.parse_args()
    report = scan(Path(args.repo))
    print(json.dumps(report, ensure_ascii=True, indent=2))
    if report["summary"]["blocker"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
''',
    "scripts/scan_docs_agent_readability.py": r'''#!/usr/bin/env python3
"""Scan docs routing and earned-shape review signals without moving files."""
from __future__ import annotations

import argparse
import json
import re
from collections import defaultdict
from pathlib import Path

from _docs_common import finding, load_governance_config, now_iso, read_text, severity_counts

DURABLE_SUFFIXES = {".md", ".mdx", ".csv", ".yaml", ".yml", ".json"}
IGNORE_NAMES = {"README.md", "_template.md", ".gitkeep"}
IGNORE_PREFIXES = {"readme", "index", "overview", "guide", "intro", "current", "future", "system", "general", "shared"}
ARTIFACT_AXIS_NAMES = {"states", "state", "rules", "rule", "metrics", "metric", "permissions", "permission", "glossary", "terms", "domain", "domains", "models", "api", "apis", "flows", "decisions", "templates", "schemas"}
METHOD_MANAGED = {"docs/roadmap/future", "docs/goal-proof"}


def _rel(root: Path, path: Path) -> str:
    return path.relative_to(root).as_posix()


def _is_method_managed(root: Path, path: Path) -> bool:
    rel = _rel(root, path)
    return any(rel == prefix or rel.startswith(prefix + "/") for prefix in METHOD_MANAGED)


def _direct_artifacts(path: Path) -> list[Path]:
    return sorted(p for p in path.iterdir() if p.is_file() and p.name not in IGNORE_NAMES and p.suffix.lower() in DURABLE_SUFFIXES)


def _meaningful_children(path: Path) -> list[Path]:
    return sorted(p for p in path.iterdir() if p.is_dir() and not p.name.startswith("."))


def _entry_findings(root: Path) -> list[dict]:
    findings: list[dict] = []
    docs = root / "docs"
    if docs.exists() and not (docs / "README.md").is_file():
        findings.append(finding("DOCS_ROUTER_MISSING", "warn", "docs/README.md", "docs tree has no top-level router", "add a concise layer map and read-next routes"))
    return findings


def _empty_and_single_partition_findings(root: Path, docs: Path) -> list[dict]:
    findings: list[dict] = []
    for path in sorted(p for p in docs.rglob("*") if p.is_dir() and not p.name.startswith(".")):
        rel_parts = path.relative_to(docs).parts
        if len(rel_parts) < 2 or _is_method_managed(root, path):
            continue
        durable_recursive = [p for p in path.rglob("*") if p.is_file() and p.name not in IGNORE_NAMES and p.suffix.lower() in DURABLE_SUFFIXES]
        if not durable_recursive:
            findings.append(finding(
                "DOCS_EMPTY_PARTITION", "warn", _rel(root, path),
                "partition contains no durable artifact",
                "remove the empty taxonomy or add it only when a real boundary has earned the directory",
            ))
            continue
        direct = _direct_artifacts(path)
        children = _meaningful_children(path)
        if len(durable_recursive) == 1 and len(direct) == 1 and not children:
            findings.append(finding(
                "DOCS_SINGLE_ARTIFACT_PARTITION", "info", _rel(root, path),
                f"partition contains a single durable artifact: {direct[0].name}",
                "review whether ownership, security, retention or routing justifies the directory; otherwise flatten it",
            ))
    return findings


def _depth_findings(root: Path, docs: Path, preferred: int) -> list[dict]:
    findings: list[dict] = []
    for path in sorted(p for p in docs.rglob("*") if p.is_dir() and not p.name.startswith(".")):
        if _is_method_managed(root, path):
            continue
        internal_depth = max(0, len(path.relative_to(docs).parts) - 1)
        if internal_depth > preferred:
            findings.append(finding(
                "DOCS_DEEP_PARTITION_REVIEW", "info", _rel(root, path),
                f"layer-internal depth {internal_depth} exceeds preferred review depth {preferred}",
                "confirm every nesting level represents a durable boundary and flatten levels that only classify cosmetically",
            ))
    return findings


def _child_readme_findings(root: Path, docs: Path, threshold: int) -> list[dict]:
    findings: list[dict] = []
    for path in sorted(p for p in docs.rglob("*") if p.is_dir() and not p.name.startswith(".")):
        rel_parts = path.relative_to(docs).parts
        if len(rel_parts) < 2 or _is_method_managed(root, path):
            continue
        direct = _direct_artifacts(path)
        children = _meaningful_children(path)
        readme = path / "README.md"
        if len(direct) + len(children) >= threshold and not readme.is_file():
            findings.append(finding(
                "DOCS_CHILD_README_MISSING", "warn", _rel(root, path),
                f"dense child partition has {len(direct)} direct artifacts and {len(children)} child directories but no local router",
                "add a short Scope, Contents and Read Next README, or simplify the partition",
            ))
        if readme.is_file():
            text = read_text(readme)
            if "## Owns" in text and "## Must Not Own" in text and not re.search(r"nested project|independent authority|独立项目|独立权威", text, re.I):
                findings.append(finding(
                    "DOCS_REDUNDANT_CHILD_AUTHORITY", "warn", _rel(root, readme),
                    "child README appears to repeat a full authority contract",
                    "inherit authority from the top-level layer and keep only Scope, Contents, Read Next and genuine local exceptions",
                ))
    return findings


def _prefix_cluster_findings(root: Path, docs: Path, threshold: int) -> list[dict]:
    findings: list[dict] = []
    for path in [docs, *sorted(p for p in docs.rglob("*") if p.is_dir() and not p.name.startswith("."))]:
        if _is_method_managed(root, path):
            continue
        clusters: dict[str, list[str]] = defaultdict(list)
        for file in _direct_artifacts(path):
            stem = re.sub(r"^\d+[-_]", "", file.stem.lower())
            prefix = re.split(r"[-_]", stem, maxsplit=1)[0]
            if prefix and prefix not in IGNORE_PREFIXES and len(prefix) > 2:
                clusters[prefix].append(file.name)
        for prefix, names in sorted(clusters.items()):
            if len(names) >= threshold:
                findings.append(finding(
                    "DOCS_REPEATED_PREFIX_CLUSTER", "info", _rel(root, path),
                    f"{len(names)} artifacts share prefix '{prefix}'",
                    "read the artifacts and routing context; partition only if the prefix reflects a durable semantic boundary",
                    evidence=[_rel(root, path / name) for name in names],
                ))
    return findings


def _mixed_axis_findings(root: Path, docs: Path) -> list[dict]:
    findings: list[dict] = []
    for layer in sorted(p for p in docs.iterdir() if p.is_dir() and not p.name.startswith(".")):
        children = _meaningful_children(layer)
        if len(children) < 2:
            continue
        artifact_dirs = [p.name for p in children if p.name.lower() in ARTIFACT_AXIS_NAMES]
        domain_dirs = [p.name for p in children if p.name.lower() not in ARTIFACT_AXIS_NAMES]
        if artifact_dirs and domain_dirs:
            findings.append(finding(
                "DOCS_MIXED_AXIS_REVIEW", "info", _rel(root, layer),
                f"layer mixes artifact-type directories {artifact_dirs} with possible domain directories {domain_dirs}",
                "choose one organizing axis per nesting level or document why the mixed route is unambiguous",
            ))
    return findings


def _read_next_findings(root: Path, docs: Path) -> list[dict]:
    findings: list[dict] = []
    for readme in sorted(docs.glob("*/README.md")):
        text = read_text(readme)
        if not any(token in text for token in ("## Read Next", "## Homes", "## 下一步阅读", "## 使用方式", "## 入口")):
            findings.append(finding(
                "DOCS_LAYER_READ_NEXT_MISSING", "info", _rel(root, readme),
                "top-level layer README has no explicit entry route",
                "add a compact Read Next or current entry-point section",
            ))
    return findings


def scan(repo: Path) -> dict:
    root = repo.resolve()
    docs = root / "docs"
    config = load_governance_config(root)
    structure = config.get("structure", {})
    preferred = int(structure.get("preferred_max_depth", 2))
    threshold = int(structure.get("child_readme_threshold", 5))
    prefix_threshold = int(structure.get("repeated_prefix_hint_threshold", 3))
    findings: list[dict] = []
    findings.extend(_entry_findings(root))
    if docs.is_dir():
        findings.extend(_empty_and_single_partition_findings(root, docs))
        findings.extend(_depth_findings(root, docs, preferred))
        findings.extend(_child_readme_findings(root, docs, threshold))
        findings.extend(_prefix_cluster_findings(root, docs, prefix_threshold))
        findings.extend(_mixed_axis_findings(root, docs))
        findings.extend(_read_next_findings(root, docs))
    report = {
        "version": "v2",
        "scannedAt": now_iso(),
        "repoRoot": str(root),
        "policy": {"preferredMaxDepth": preferred, "childReadmeThreshold": threshold, "repeatedPrefixHintThreshold": prefix_threshold},
        "findings": findings,
    }
    report["summary"] = severity_counts(findings)
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", default=".")
    args = parser.parse_args()
    report = scan(Path(args.repo))
    print(json.dumps(report, ensure_ascii=True, indent=2))
    if report["summary"]["blocker"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
''',
    "scripts/scan_docs_links.py": r'''#!/usr/bin/env python3
"""Validate repository-relative Markdown links under docs/."""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from urllib.parse import unquote

from _docs_common import finding, iter_files, now_iso, severity_counts

LINK_RE = re.compile(r"(?<!!)\[[^\]]*\]\(([^)]+)\)")
SKIP_SCHEMES = ("http://", "https://", "mailto:", "tel:", "data:")


def scan(repo: Path) -> dict:
    root = repo.resolve()
    docs = root / "docs"
    findings: list[dict] = []
    checked = 0
    for path in iter_files(docs, (".md", ".mdx")) or []:
        text = path.read_text(encoding="utf-8", errors="ignore")
        for raw in LINK_RE.findall(text):
            target_text = raw.strip().split()[0].strip("<>")
            if not target_text or target_text.startswith("#") or target_text.lower().startswith(SKIP_SCHEMES):
                continue
            target_text = unquote(target_text.split("#", 1)[0].split("?", 1)[0])
            if not target_text:
                continue
            checked += 1
            target = (root / target_text.lstrip("/")) if target_text.startswith("/") else (path.parent / target_text)
            if not target.exists():
                rel = path.relative_to(root).as_posix()
                findings.append(finding(
                    "DOCS_LINK_BROKEN", "warn", rel,
                    f"relative Markdown link target does not exist: {raw}",
                    "repair the target, update the route during the same move, or remove the stale link",
                    evidence=[str(target.resolve())],
                ))
    report = {"version": "v1", "scannedAt": now_iso(), "repoRoot": str(root), "checkedLinks": checked, "findings": findings}
    report["summary"] = severity_counts(findings)
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", default=".")
    args = parser.parse_args()
    report = scan(Path(args.repo))
    print(json.dumps(report, ensure_ascii=True, indent=2))
    if report["summary"]["blocker"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
''',
    "scripts/scan_source_doc_anchors.py": r'''#!/usr/bin/env python3
"""Audit repository-path anchors written in docs code spans."""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

from _docs_common import finding, iter_files, now_iso, severity_counts

CODE_RE = re.compile(r"`([^`\n]+)`")
PREFIXES = ("src/", "app/", "apps/", "packages/", "services/", "libs/", "crates/", "scripts/", "specs/", "tests/", "test/", "docs/")


def scan(repo: Path) -> dict:
    root = repo.resolve()
    docs = root / "docs"
    findings: list[dict] = []
    checked = 0
    for path in iter_files(docs, (".md", ".mdx")) or []:
        text = path.read_text(encoding="utf-8", errors="ignore")
        for raw in CODE_RE.findall(text):
            value = raw.strip().rstrip(".:")
            if not value.startswith(PREFIXES) or "<" in value or ">" in value:
                continue
            prefix = re.split(r"[\*\?\[]", value, maxsplit=1)[0].rstrip("/")
            if not prefix:
                continue
            checked += 1
            target = root / prefix
            if not target.exists():
                rel = path.relative_to(root).as_posix()
                findings.append(finding(
                    "DOCS_SOURCE_ANCHOR_MISSING", "warn", rel,
                    f"documented repository path does not exist: {value}",
                    "repair the anchor, label it as a future/example path, or remove the stale current claim",
                    evidence=[str(target)],
                ))
    report = {"version": "v1", "scannedAt": now_iso(), "repoRoot": str(root), "checkedAnchors": checked, "findings": findings}
    report["summary"] = severity_counts(findings)
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", default=".")
    args = parser.parse_args()
    report = scan(Path(args.repo))
    print(json.dumps(report, ensure_ascii=True, indent=2))
    if report["summary"]["blocker"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
''',
    "scripts/scan_future_capsules.py": r'''#!/usr/bin/env python3
"""Audit capability-oriented Roadmap future capsules and reject shadow authority trees."""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

from _docs_common import finding, now_iso, parse_frontmatter, read_text, severity_counts

SHADOW_LAYERS = {"ssot", "standards", "adr", "architecture", "product", "features", "protocols", "design", "reports", "api", "runbook", "security", "data"}
REQUIRED_FRONTMATTER = {"node_id", "artifact_type", "status", "authority_scope", "objective", "claim_limit", "evidence_contract", "next_action"}
SECTION_GROUPS = {
    "Product Hypothesis": ("## Product Hypothesis", "## 产品假设"),
    "Candidate Capability Boundary": ("## Candidate Capability Boundary", "## 候选能力边界"),
    "Reusable Current Foundations": ("## Reusable Current Foundations", "## 当前可复用基础"),
    "Current Non-authority": ("## Current Non-authority", "## Current Non-Authority", "## 当前非权威"),
    "Candidate Authority Model": ("## Candidate Authority Model", "## 候选权威模型"),
    "Candidate Architecture": ("## Candidate Architecture", "## 候选架构"),
    "Prerequisites": ("## Prerequisites", "## 前置条件"),
    "Promotion Gates": ("## Promotion Gates", "## 晋升门槛"),
    "First Falsifiable Proof": ("## First Falsifiable Proof", "## 首个可证伪证明"),
    "Forbidden Early Implementations": ("## Forbidden Early Implementations", "## 禁止提前实现"),
    "Promotion Targets": ("## Promotion Targets", "## 晋升目标"),
    "Sources And Evidence": ("## Sources And Evidence", "## 来源与证据"),
}


def scan(repo: Path) -> dict:
    root_repo = repo.resolve()
    root = root_repo / "docs" / "roadmap" / "future"
    findings: list[dict] = []
    capsules: list[dict] = []
    if not root.exists():
        return {"version": "v2", "scannedAt": now_iso(), "root": str(root), "summary": severity_counts([]), "findings": [], "capsules": [], "skipped": True, "reason": "docs/roadmap/future does not exist"}

    for required in (root / "README.md", root / "_template.md"):
        if not required.is_file():
            findings.append(finding("FUTURE_CAPSULE_BASELINE_MISSING", "warn", required, f"missing future capsule baseline file: {required.name}", "add a concise index and reusable capsule template when future capsules are in use"))

    children = sorted(p for p in root.iterdir() if p.is_dir() and not p.name.startswith("."))
    index_text = read_text(root / "README.md") if (root / "README.md").is_file() else ""
    indexed_dirs = set(re.findall(r"\(([^)/#]+?)/README\.md(?:#[^)]+)?\)", index_text))
    node_ids: dict[str, Path] = {}

    for child in children:
        if child.name.lower() in SHADOW_LAYERS:
            findings.append(finding("FUTURE_SHADOW_AUTHORITY_LAYER", "blocker", child, f"future tree recreates authority layer: {child.name}", "replace the shadow tree with capability-oriented capsules and promotion targets"))
            continue
        readme = child / "README.md"
        if child.name not in indexed_dirs:
            findings.append(finding("FUTURE_CAPSULE_NOT_INDEXED", "warn", child, f"capsule is not linked from future/README.md: {child.name}", "link the capsule from the nearest future router"))
        if not readme.is_file():
            findings.append(finding("FUTURE_CAPSULE_README_MISSING", "warn", child, "capability directory has no README.md", "make the capability README the capsule entry point"))
            continue
        text = read_text(readme)
        fm = parse_frontmatter(text)
        missing_fields = sorted(REQUIRED_FRONTMATTER - set(fm))
        if missing_fields:
            findings.append(finding("FUTURE_CAPSULE_FRONTMATTER", "warn", readme, f"missing capsule frontmatter: {', '.join(missing_fields)}", "add explicit future authority scope, claim ceiling, proof contract and next action"))
        if fm.get("authority_scope") not in {"future-candidate", None, ""}:
            findings.append(finding("FUTURE_CAPSULE_AUTHORITY_SCOPE", "blocker", readme, f"unexpected authority_scope: {fm.get('authority_scope')}", "set authority_scope to future-candidate; current authority belongs in formal layers"))
        node_id = str(fm.get("node_id", ""))
        if node_id:
            if node_id in node_ids:
                findings.append(finding("FUTURE_CAPSULE_NODE_ID_DUPLICATE", "blocker", readme, f"duplicate node_id: {node_id}", "use a unique graph node ID only for graph-participating capsules", evidence=[str(node_ids[node_id]), str(readme)]))
            else:
                node_ids[node_id] = readme
        missing_sections = [name for name, variants in SECTION_GROUPS.items() if not any(token in text for token in variants)]
        if missing_sections:
            findings.append(finding("FUTURE_CAPSULE_SECTIONS", "warn", readme, f"missing capsule sections: {', '.join(missing_sections)}", "answer the missing candidate, gate, proof and promotion questions"))
        capsules.append({"name": child.name, "path": readme.relative_to(root_repo).as_posix(), "node_id": node_id})

    report = {"version": "v2", "scannedAt": now_iso(), "root": str(root), "capsules": capsules, "findings": findings}
    report["summary"] = severity_counts(findings)
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", default=".")
    args = parser.parse_args()
    report = scan(Path(args.repo))
    print(json.dumps(report, ensure_ascii=True, indent=2))
    if report["summary"]["blocker"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
''',
    "scripts/artifact_graph.py": r'''#!/usr/bin/env python3
"""Inspect opt-in artifact graph frontmatter without treating it as universal document identity."""
from __future__ import annotations

import argparse
import difflib
import json
import re
import sys
from collections import Counter, defaultdict, deque
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from _docs_common import FRONTMATTER_RE, as_list, finding, now_iso, parse_frontmatter, read_text, severity_counts

DEFAULT_ROOTS = ("docs/goal-proof", "docs/roadmap")
NODE_TYPES = {"seed", "proposal", "source", "brief", "goal", "plan", "report", "roadmap"}
STATUSES = {"weak-signal", "open-candidate", "bridge-needed", "ready", "active", "completed", "blocked", "retired"}
EDGE_FIELDS = ("depends_on", "blocks", "unblocks", "bridges_to", "related_to", "supersedes")
REFERENCE_FIELDS = ("source_material", "evidence")
UNRESOLVED = {"weak-signal", "open-candidate", "bridge-needed", "blocked"}


@dataclass(frozen=True)
class Node:
    node_id: str
    artifact_type: str
    status: str
    path: str
    title: str
    fields: dict[str, Any]


def _title(text: str, fallback: str) -> str:
    match = re.search(r"^#\s+(.+)$", text, re.M)
    return match.group(1).strip() if match else fallback


def load_nodes(repo: Path, roots: list[str]) -> tuple[list[Node], list[dict]]:
    nodes: list[Node] = []
    findings: list[dict] = []
    for rel_root in roots:
        base = repo / rel_root
        if not base.exists():
            continue
        for path in sorted(base.rglob("*.md")):
            text = read_text(path)
            fields = parse_frontmatter(text)
            if not fields or not any(key in fields for key in ("node_id", "artifact_type", "status")):
                continue
            missing = [key for key in ("node_id", "artifact_type", "status") if not fields.get(key)]
            rel = path.relative_to(repo).as_posix()
            if missing:
                findings.append(finding("GRAPH_FRONTMATTER_INCOMPLETE", "warn", rel, f"graph participant missing: {', '.join(missing)}", "add all minimum graph fields or remove partial graph metadata"))
                continue
            nodes.append(Node(str(fields["node_id"]), str(fields["artifact_type"]), str(fields["status"]), rel, _title(text, path.stem), fields))
    return nodes, findings


def node_maps(nodes: list[Node]) -> tuple[dict[str, Node], dict[str, list[Node]]]:
    grouped: dict[str, list[Node]] = defaultdict(list)
    for node in nodes:
        grouped[node.node_id].append(node)
    return {key: values[0] for key, values in grouped.items()}, grouped


def build_edges(nodes: list[Node]) -> list[dict[str, str]]:
    edges: list[dict[str, str]] = []
    for node in nodes:
        for field in EDGE_FIELDS:
            for target in as_list(node.fields.get(field)):
                source, dest = node.node_id, target
                if field == "blocks":
                    source, dest = node.node_id, target
                elif field == "unblocks":
                    source, dest = node.node_id, target
                edges.append({"source": source, "target": dest, "relation": field})
    return edges


def _dependency_cycles(nodes: list[Node]) -> list[list[str]]:
    graph: dict[str, list[str]] = defaultdict(list)
    for node in nodes:
        graph[node.node_id].extend(as_list(node.fields.get("depends_on")))
    cycles: list[list[str]] = []
    visiting: set[str] = set()
    visited: set[str] = set()
    stack: list[str] = []

    def visit(current: str) -> None:
        if current in visiting:
            index = stack.index(current) if current in stack else 0
            cycle = stack[index:] + [current]
            if cycle not in cycles:
                cycles.append(cycle)
            return
        if current in visited:
            return
        visiting.add(current)
        stack.append(current)
        for nxt in graph.get(current, []):
            visit(nxt)
        stack.pop()
        visiting.remove(current)
        visited.add(current)

    for node in graph:
        visit(node)
    return cycles


def audit_findings(repo: Path, nodes: list[Node], edges: list[dict], base: list[dict]) -> list[dict]:
    findings = list(base)
    by_id, grouped = node_maps(nodes)
    for node_id, duplicates in grouped.items():
        if len(duplicates) > 1:
            findings.append(finding("GRAPH_NODE_ID_DUPLICATE", "blocker", node_id, f"node_id appears in {len(duplicates)} files", "keep node_id unique within scanned graph roots", evidence=[node.path for node in duplicates]))
    for node in nodes:
        if node.artifact_type not in NODE_TYPES:
            findings.append(finding("GRAPH_NODE_TYPE_UNKNOWN", "warn", node.path, f"unknown artifact_type: {node.artifact_type}", "use the documented schema or deliberately extend both docs and script"))
        if node.status not in STATUSES:
            findings.append(finding("GRAPH_STATUS_UNKNOWN", "warn", node.path, f"unknown status: {node.status}", "use the documented status vocabulary or deliberately extend it"))
        for field in REFERENCE_FIELDS:
            for ref in as_list(node.fields.get(field)):
                if ref.startswith(("http://", "https://", "mailto:")):
                    continue
                target = repo / ref.split("#", 1)[0]
                if not target.exists():
                    findings.append(finding("GRAPH_REFERENCE_MISSING", "warn", node.path, f"{field} reference does not exist: {ref}", "repair or remove the stale evidence/source reference", evidence=[str(target)]))
        if node.status == "completed" and node.artifact_type not in {"report", "source"} and not as_list(node.fields.get("evidence")):
            findings.append(finding("GRAPH_COMPLETED_WITHOUT_EVIDENCE_REVIEW", "warn", node.path, "completed non-report/source node has no evidence reference", "link completion evidence or correct the status"))
    for edge in edges:
        if edge["source"] == edge["target"]:
            findings.append(finding("GRAPH_SELF_EDGE", "blocker", edge["source"], f"self relation: {edge['relation']}", "remove the self relation"))
        if edge["target"] not in by_id:
            source_path = by_id[edge["source"]].path if edge["source"] in by_id else edge["source"]
            findings.append(finding("GRAPH_TARGET_MISSING", "blocker", source_path, f"relation target does not exist: {edge['target']}", "add the intended graph node or remove the stale relation"))
    for cycle in _dependency_cycles(nodes):
        findings.append(finding("GRAPH_DEPENDENCY_CYCLE", "blocker", cycle[0], "depends_on cycle: " + " -> ".join(cycle), "break the dependency cycle after semantic review", evidence=cycle))
    return findings


def node_to_dict(node: Node) -> dict[str, Any]:
    return {
        "node_id": node.node_id,
        "artifact_type": node.artifact_type,
        "status": node.status,
        "path": node.path,
        "title": node.title,
        "relations": {field: as_list(node.fields.get(field)) for field in EDGE_FIELDS if as_list(node.fields.get(field))},
        "references": {field: as_list(node.fields.get(field)) for field in REFERENCE_FIELDS if as_list(node.fields.get(field))},
        "next_action": node.fields.get("next_action", ""),
    }


def graph_report(repo: Path, roots: list[str]) -> dict:
    nodes, base = load_nodes(repo, roots)
    edges = build_edges(nodes)
    findings = audit_findings(repo, nodes, edges, base)
    return {
        "version": "v2",
        "scannedAt": now_iso(),
        "repoRoot": str(repo),
        "roots": roots,
        "summary": {"nodes": len(nodes), "edges": len(edges), **severity_counts(findings), "statusCounts": dict(Counter(n.status for n in nodes)), "typeCounts": dict(Counter(n.artifact_type for n in nodes))},
        "nodes": [node_to_dict(node) for node in nodes],
        "edges": edges,
        "findings": findings,
    }


def command_scan(args: argparse.Namespace) -> dict:
    report = graph_report(args.repo, args.roots)
    return {key: report[key] for key in ("version", "scannedAt", "repoRoot", "roots", "summary", "nodes", "edges")}


def command_audit(args: argparse.Namespace) -> dict:
    return graph_report(args.repo, args.roots)


def command_consistency(args: argparse.Namespace) -> dict:
    report = graph_report(args.repo, args.roots)
    findings = report["findings"] if getattr(args, "include_audit_findings", True) else [item for item in report["findings"] if item["ruleId"] in {"GRAPH_NODE_ID_DUPLICATE", "GRAPH_TARGET_MISSING", "GRAPH_SELF_EDGE", "GRAPH_DEPENDENCY_CYCLE"}]
    return {"version": "v2", "summary": severity_counts(findings), "findings": findings}


def _incoming_outgoing(edges: list[dict]) -> tuple[dict[str, list[dict]], dict[str, list[dict]]]:
    incoming: dict[str, list[dict]] = defaultdict(list)
    outgoing: dict[str, list[dict]] = defaultdict(list)
    for edge in edges:
        incoming[edge["target"]].append(edge)
        outgoing[edge["source"]].append(edge)
    return incoming, outgoing


def command_node(args: argparse.Namespace) -> dict:
    nodes, _ = load_nodes(args.repo, args.roots)
    by_id, _ = node_maps(nodes)
    node = by_id.get(args.node_id)
    return {"node": node_to_dict(node) if node else None}


def command_ready(args: argparse.Namespace) -> dict:
    nodes, _ = load_nodes(args.repo, args.roots)
    ready = [node_to_dict(node) for node in nodes if node.status in {"ready", "active"}]
    return {"ready": ready, "count": len(ready)}


def command_blockers(args: argparse.Namespace) -> dict:
    nodes, _ = load_nodes(args.repo, args.roots)
    by_id, _ = node_maps(nodes)
    node = by_id.get(args.node_id)
    if not node:
        return {"node_id": args.node_id, "blocked_by": [], "missing": True}
    blockers = []
    for target in as_list(node.fields.get("depends_on")):
        other = by_id.get(target)
        if other and other.status in UNRESOLVED:
            blockers.append(other)
    return {"node_id": args.node_id, "blocked_by": [node_to_dict(item) for item in blockers]}


def command_orphans(args: argparse.Namespace) -> dict:
    nodes, _ = load_nodes(args.repo, args.roots)
    edges = build_edges(nodes)
    incoming, outgoing = _incoming_outgoing(edges)
    orphans = [node_to_dict(node) for node in nodes if not incoming.get(node.node_id) and not outgoing.get(node.node_id) and not (node.status in {"retired", "completed"} and node.artifact_type in {"report", "source"})]
    return {"orphans": orphans, "count": len(orphans)}


def command_review_list(args: argparse.Namespace) -> dict:
    report = graph_report(args.repo, args.roots)
    priority = {"active": 0, "ready": 1, "blocked": 2, "bridge-needed": 3, "open-candidate": 4, "weak-signal": 5, "completed": 6, "retired": 7}
    nodes = sorted(report["nodes"], key=lambda item: (priority.get(item["status"], 99), item["artifact_type"], item["path"]))
    return {"review_nodes": nodes[: args.limit], "count": len(nodes), "limit": args.limit}


def command_status_impact(args: argparse.Namespace) -> dict:
    nodes, _ = load_nodes(args.repo, args.roots)
    impacted = []
    for node in nodes:
        for field in ("depends_on", "blocks", "unblocks"):
            if args.node_id in as_list(node.fields.get(field)):
                impacted.append({"node": node_to_dict(node), "relation_field": field})
    return {"node_id": args.node_id, "impacted": impacted, "count": len(impacted)}


def command_unblock_review(args: argparse.Namespace) -> dict:
    nodes, _ = load_nodes(args.repo, args.roots)
    by_id, _ = node_maps(nodes)
    candidates = []
    for node in nodes:
        deps = as_list(node.fields.get("depends_on"))
        if args.node_id not in deps:
            continue
        unresolved = [dep for dep in deps if dep in by_id and by_id[dep].status in UNRESOLVED and dep != args.node_id]
        candidates.append({"node": node_to_dict(node), "remaining_unresolved": unresolved})
    return {"completed_or_changed": args.node_id, "review_candidates": candidates, "count": len(candidates)}


def _neighborhood(nodes: list[Node], edges: list[dict], anchor: str, depth: int, limit: int) -> tuple[list[Node], list[dict]]:
    by_id, _ = node_maps(nodes)
    if anchor not in by_id:
        return [], []
    adjacency: dict[str, set[str]] = defaultdict(set)
    for edge in edges:
        adjacency[edge["source"]].add(edge["target"])
        adjacency[edge["target"]].add(edge["source"])
    seen = {anchor}
    queue: deque[tuple[str, int]] = deque([(anchor, 0)])
    ordered = [anchor]
    while queue and len(ordered) < limit:
        current, dist = queue.popleft()
        if dist >= depth:
            continue
        for nxt in sorted(adjacency.get(current, set())):
            if nxt in by_id and nxt not in seen:
                seen.add(nxt)
                ordered.append(nxt)
                queue.append((nxt, dist + 1))
    selected = set(ordered)
    return [by_id[item] for item in ordered], [edge for edge in edges if edge["source"] in selected and edge["target"] in selected]


def command_current(args: argparse.Namespace) -> dict:
    nodes, _ = load_nodes(args.repo, args.roots)
    edges = build_edges(nodes)
    anchor = args.anchor or (nodes[0].node_id if nodes else "")
    focus, focus_edges = _neighborhood(nodes, edges, anchor, args.depth, args.limit) if anchor else ([], [])
    return {"anchor": anchor, "nodes": [node_to_dict(node) for node in focus], "edges": focus_edges}


def command_queue_consistency(args: argparse.Namespace) -> dict:
    if not getattr(args, "queue", None):
        return {"version": "v2", "summary": severity_counts([]), "findings": [], "skipped": True, "reason": "queue checks require explicit --queue"}
    queue = args.repo / args.queue
    findings = []
    if not queue.is_file():
        findings.append(finding("GRAPH_QUEUE_MISSING", "warn", args.queue, "configured decision queue does not exist", "repair the queue path or omit the queue check"))
    return {"version": "v2", "summary": severity_counts(findings), "findings": findings}


def _serialize_value(value: Any) -> list[str]:
    if isinstance(value, list):
        return ["  - " + str(item) for item in value]
    if isinstance(value, bool):
        return ["true" if value else "false"]
    return [str(value)]


def _replace_frontmatter(text: str, fields: dict[str, Any]) -> str:
    match = FRONTMATTER_RE.match(text)
    if not match:
        raise ValueError("file has no parseable frontmatter")
    lines = ["---"]
    preferred = ["node_id", "artifact_type", "status", *EDGE_FIELDS, *REFERENCE_FIELDS, "authority_scope", "objective", "claim_limit", "evidence_contract", "next_action"]
    keys = [key for key in preferred if key in fields] + sorted(key for key in fields if key not in preferred)
    for key in keys:
        value = fields[key]
        if isinstance(value, list):
            lines.append(f"{key}:")
            lines.extend(_serialize_value(value))
        else:
            lines.append(f"{key}: {_serialize_value(value)[0]}")
    lines.append("---")
    return "\n".join(lines) + "\n" + text[match.end():]


def _write_update(args: argparse.Namespace, updater) -> dict:
    nodes, _ = load_nodes(args.repo, args.roots)
    by_id, _ = node_maps(nodes)
    node = by_id.get(args.node_id)
    if not node:
        raise ValueError(f"node not found: {args.node_id}")
    path = args.repo / node.path
    old = read_text(path)
    fields = parse_frontmatter(old)
    updater(fields)
    new = _replace_frontmatter(old, fields)
    diff = "".join(difflib.unified_diff(old.splitlines(keepends=True), new.splitlines(keepends=True), fromfile=node.path, tofile=node.path))
    if args.write and new != old:
        path.write_text(new, encoding="utf-8")
    return {"node_id": node.node_id, "path": node.path, "changed": new != old, "written": bool(args.write and new != old), "dry_run": not args.write, "diff": diff, "note": "write helpers do not infer semantic correctness; rerun audit"}


def command_update_node(args: argparse.Namespace) -> dict:
    def update(fields: dict[str, Any]) -> None:
        for key in ("status", "next_action", "objective", "claim_limit", "evidence_contract"):
            value = getattr(args, key, None)
            if value is not None:
                fields[key] = value
    return _write_update(args, update)


def command_add_evidence(args: argparse.Namespace) -> dict:
    return _write_update(args, lambda fields: fields.__setitem__("evidence", sorted(set(as_list(fields.get("evidence")) + [args.value]))))


def command_add_relation(args: argparse.Namespace) -> dict:
    if args.field not in EDGE_FIELDS:
        raise ValueError(f"invalid relation field: {args.field}")
    return _write_update(args, lambda fields: fields.__setitem__(args.field, sorted(set(as_list(fields.get(args.field)) + [args.target]))))


def command_remove_relation(args: argparse.Namespace) -> dict:
    if args.field not in EDGE_FIELDS:
        raise ValueError(f"invalid relation field: {args.field}")
    return _write_update(args, lambda fields: fields.__setitem__(args.field, [item for item in as_list(fields.get(args.field)) if item != args.target]))


def _mermaid_id(value: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9_]", "_", value)
    return "n_" + cleaned if not cleaned or cleaned[0].isdigit() else cleaned


def command_mermaid(args: argparse.Namespace) -> str:
    nodes, _ = load_nodes(args.repo, args.roots)
    edges = build_edges(nodes)
    anchor = args.anchor or (nodes[0].node_id if nodes else "")
    focus, focus_edges = _neighborhood(nodes, edges, anchor, args.depth, args.limit) if anchor else ([], [])
    lines = ["flowchart LR"]
    for node in focus:
        lines.append(f'  {_mermaid_id(node.node_id)}["{node.node_id}\\n{node.status}"]')
    for edge in focus_edges:
        lines.append(f"  {_mermaid_id(edge['source'])} -- {edge['relation']} --> {_mermaid_id(edge['target'])}")
    return "\n".join(lines)


def add_common(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--repo", default=".", type=Path)
    parser.add_argument("--roots", nargs="*", default=list(DEFAULT_ROOTS))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    for name in ("scan", "audit", "ready", "orphans", "review-list", "consistency"):
        p = sub.add_parser(name)
        add_common(p)
        if name == "review-list":
            p.add_argument("--limit", type=int, default=30)
        if name == "consistency":
            p.add_argument("--include-audit-findings", action="store_true")
    for name in ("node", "blockers", "status-impact", "unblock-review"):
        p = sub.add_parser(name)
        p.add_argument("node_id")
        add_common(p)
    current = sub.add_parser("current")
    add_common(current)
    current.add_argument("--anchor")
    current.add_argument("--depth", type=int, default=1)
    current.add_argument("--limit", type=int, default=20)
    mermaid = sub.add_parser("mermaid")
    add_common(mermaid)
    mermaid.add_argument("--anchor")
    mermaid.add_argument("--depth", type=int, default=1)
    mermaid.add_argument("--limit", type=int, default=20)
    queue = sub.add_parser("queue-consistency")
    add_common(queue)
    queue.add_argument("--queue")
    update = sub.add_parser("update-node")
    update.add_argument("node_id")
    add_common(update)
    update.add_argument("--status", choices=sorted(STATUSES))
    update.add_argument("--next-action")
    update.add_argument("--objective")
    update.add_argument("--claim-limit")
    update.add_argument("--evidence-contract")
    update.add_argument("--write", action="store_true")
    evidence = sub.add_parser("add-evidence")
    evidence.add_argument("node_id")
    evidence.add_argument("value")
    add_common(evidence)
    evidence.add_argument("--write", action="store_true")
    for name in ("add-relation", "remove-relation"):
        p = sub.add_parser(name)
        p.add_argument("node_id")
        p.add_argument("field", choices=EDGE_FIELDS)
        p.add_argument("target")
        add_common(p)
        p.add_argument("--write", action="store_true")
    args = parser.parse_args()
    args.repo = args.repo.resolve()
    dispatch = {
        "scan": command_scan, "audit": command_audit, "node": command_node,
        "current": command_current, "ready": command_ready, "blockers": command_blockers,
        "consistency": command_consistency, "status-impact": command_status_impact,
        "unblock-review": command_unblock_review, "queue-consistency": command_queue_consistency,
        "orphans": command_orphans, "review-list": command_review_list,
        "update-node": command_update_node, "add-evidence": command_add_evidence,
        "add-relation": command_add_relation, "remove-relation": command_remove_relation,
    }
    if args.command == "mermaid":
        print(command_mermaid(args))
        return
    result = dispatch[args.command](args)
    print(json.dumps(result, ensure_ascii=True, indent=2))
    summary = result.get("summary") if isinstance(result, dict) else None
    if isinstance(summary, dict) and summary.get("blocker", 0):
        raise SystemExit(1)


if __name__ == "__main__":
    main()
''',
    "scripts/run_docs_audit.py": r'''#!/usr/bin/env python3
"""Run docs governance scanners and print one stdout JSON report."""
from __future__ import annotations

import argparse
import importlib.util
import json
import sys
from pathlib import Path
from types import ModuleType

from _docs_common import now_iso, severity_counts


def _load(path: Path, name: str) -> ModuleType:
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"cannot load module: {path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", default=".")
    parser.add_argument("--queue", default=None)
    parser.add_argument("--include-artifact-graph-findings", action="store_true")
    args = parser.parse_args()

    script_dir = Path(__file__).resolve().parent
    repo = Path(args.repo).resolve()
    baseline = _load(script_dir / "scan_docs_baseline.py", "scan_docs_baseline")
    readability = _load(script_dir / "scan_docs_agent_readability.py", "scan_docs_agent_readability")
    capsules = _load(script_dir / "scan_future_capsules.py", "scan_future_capsules")
    links = _load(script_dir / "scan_docs_links.py", "scan_docs_links")
    anchors = _load(script_dir / "scan_source_doc_anchors.py", "scan_source_doc_anchors")
    graph = _load(script_dir / "artifact_graph.py", "artifact_graph")

    reports = {
        "docsBaseline": baseline.scan(repo),
        "docsAgentReadability": readability.scan(repo),
        "futureCapsules": capsules.scan(repo),
        "docsLinks": links.scan(repo),
        "sourceDocAnchors": anchors.scan(repo),
        "artifactGraph": graph.command_audit(argparse.Namespace(repo=repo, roots=list(graph.DEFAULT_ROOTS))),
        "artifactGraphConsistency": graph.command_consistency(argparse.Namespace(repo=repo, roots=list(graph.DEFAULT_ROOTS), include_audit_findings=False)),
        "queueConsistency": graph.command_queue_consistency(argparse.Namespace(repo=repo, roots=list(graph.DEFAULT_ROOTS), queue=args.queue)),
    }

    findings: list[dict] = []
    for name, report in reports.items():
        items = list(report.get("findings", []))
        if name == "artifactGraph" and not args.include_artifact_graph_findings:
            items = [item for item in items if item.get("severity") == "blocker"]
        for item in items:
            enriched = dict(item)
            enriched.setdefault("scanner", name)
            findings.append(enriched)

    result = {
        "version": "v2",
        "scannedAt": now_iso(),
        "repoRoot": str(repo),
        "summary": severity_counts(findings),
        "findings": findings,
        "reports": reports,
        "claimLimit": "Static documentation governance only; no compile, test, migration, browser, runtime or production claim.",
    }
    print(json.dumps(result, ensure_ascii=True, indent=2))
    if result["summary"]["blocker"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
''',
}


def write_skill(out_root: Path) -> Path:
    skill = out_root / "docs-governance"
    if skill.exists():
        shutil.rmtree(skill)
    for rel, content in FILES.items():
        path = skill / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(textwrap.dedent(content).lstrip("\n"), encoding="utf-8")
    return skill


def validate(skill: Path) -> None:
    json.loads((skill / "evals" / "evals.json").read_text(encoding="utf-8"))
    for script in sorted((skill / "scripts").glob("*.py")):
        py_compile.compile(str(script), doraise=True)

    with tempfile.TemporaryDirectory() as temp:
        fixture = Path(temp)
        (fixture / "package.json").write_text("{}", encoding="utf-8")
        for path, body in {
            "docs/README.md": "# Docs\n\n## Read Next\n",
            "docs/ssot/README.md": "# SSoT\n\n## Owns\nFacts.\n\n## Must Not Own\nPlans.\n\n## Read Next\n",
            "docs/standards/README.md": "# Standards\n\n## Owns\nRules.\n\n## Must Not Own\nIdeas.\n\n## Read Next\n",
            "docs/adr/README.md": "# ADR\n\n## Owns\nDecisions.\n\n## Must Not Own\nProgress.\n\n## Read Next\n",
            "docs/adr/_template.md": "# ADR template\n",
            "docs/ssot/audit-overview.md": "# Audit overview\n",
            "docs/ssot/audit-states.md": "# Audit states\n",
            "docs/ssot/audit-rules.md": "# Audit rules\n",
            "docs/ssot/isolated/only.md": "# Only\n",
        }.items():
            target = fixture / path
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(body, encoding="utf-8")
        proc = subprocess.run(
            [sys.executable, str(skill / "scripts" / "scan_docs_agent_readability.py"), "--repo", str(fixture)],
            check=True, capture_output=True, text=True,
        )
        report = json.loads(proc.stdout)
        rules = {item["ruleId"] for item in report["findings"]}
        assert "DOCS_REPEATED_PREFIX_CLUSTER" in rules
        assert "DOCS_SINGLE_ARTIFACT_PARTITION" in rules
        subprocess.run(
            [sys.executable, str(skill / "scripts" / "run_docs_audit.py"), "--repo", str(fixture)],
            check=True, capture_output=True, text=True,
        )


def package(skill: Path, output: Path) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    if output.exists():
        output.unlink()
    with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for path in sorted(skill.rglob("*")):
            if path.is_file():
                archive.write(path, arcname=(Path("docs-governance") / path.relative_to(skill)).as_posix())


def main() -> None:
    root = Path(__file__).resolve().parent
    out = root / "out"
    out.mkdir(parents=True, exist_ok=True)
    skill = write_skill(out)
    validate(skill)
    package(skill, out / "docs-governance-upgraded.zip")
    print(json.dumps({"files": len(FILES), "archive": str(out / "docs-governance-upgraded.zip")}, indent=2))


if __name__ == "__main__":
    main()
