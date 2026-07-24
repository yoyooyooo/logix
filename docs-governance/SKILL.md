---
name: docs-governance
description: >-
  Converges and audits repository documentation governance for long-running human-agent development. Use when creating or restructuring docs/*, separating current authority from accepted targets and future candidates, preserving roadmap value, choosing an earned internal shape, cleaning stale planning trees, or validating indexes, links, lifecycle, evidence retention, and source-code alignment.
---

# Docs Governance

Converge documentation toward one current authority chain, one explicit future route, and an **earned shape**: stable semantic layers with only the internal structure and identity machinery the repository has actually earned.

## Operating Contract

```text
Owns:
  docs-layer boundaries, placement, current/target/future classification,
  earned internal shape, document identity admission, retention, indexes,
  source-code alignment audit, and docs cleanup.

Does not own:
  project-specific product truth, tracker/spec/execution lifecycle,
  implementation completion, legal retention decisions,
  or public protocol/security decisions.

Stop when:
  the highest authority is ambiguous, deletion risks unlinked evidence,
  or resolution requires a new product/security/public-contract decision.
```

## Workflow

1. Read `AGENTS.md`, `docs/README.md`, the affected layer README, and any repository-local docs policy.
2. Classify every affected claim as `current-fact`, `current-binding`, `accepted-target`, `future-candidate`, `active-proof`, or `historical-evidence`.
3. Place by semantic owner; keep one current home for each meaning.
4. Apply three admission gates independently:
   - **Layer admission** — create a top-level layer only for a durable authority boundary.
   - **Partition admission** — keep a layer flat until durable routing pressure earns a child partition.
   - **Identity admission** — use semantic paths by default; add keys, sequence numbers, or atomic requirement IDs only when real traceability pressure exists.
5. Preserve long-horizon sequence and gates in Roadmap capability capsules rather than shadow copies of SSoT, Standards, ADR, Architecture, or Product.
6. Before move or deletion, assign a lifecycle verdict, preserve source/evidence backlinks, and update the nearest index.
7. Run the deterministic audits and report blockers, review signals, deliberate exceptions, and unverified claims.

## Placement

```text
current product meaning                 -> docs/product/**
current object/fact authority            -> docs/ssot/**
current executable rule/check/command    -> docs/standards/**
adopted technical tradeoff               -> docs/adr/**
current topology / accepted seam         -> docs/architecture/**
wire schema/profile/media type           -> docs/protocols/**
UI/UX/visual behavior                    -> docs/design/**
feature/requirement detail, when needed  -> docs/features/** or the repo's declared equivalent
future sequence/gate/capability capsule  -> docs/roadmap/**
active work/progress/evidence             -> configured tracker/spec/evidence method
past audit/delivery/validation            -> docs/reports/**
implementation checklist                 -> root specs/** or owning execution artifact
```

A project may omit any unused layer. A layer may remain flat indefinitely. Structural symmetry is not a goal.

## Earned Shape

Default to:

```text
stable top-level semantic layers
flat internal organization
semantic filenames
optional metadata
```

Partition only when ownership, security, retention, lifecycle, reader routing, or repeated navigation pressure makes the flat form materially worse. Child directories inherit the parent layer's authority; they do not create a second authority chain. Prefer one organizational axis per nesting level, allow mixed and asymmetric shapes, and flatten partitions that no longer reduce ambiguity.

Read [Elastic Shape and Identity](references/elastic-shape-and-identity.md) before proposing subdirectories, numbering systems, or mandatory frontmatter.

## Future Rule

`docs/roadmap/future/<capability>/README.md` is an active route, not current authority. Promotion moves accepted authority into formal layers and shrinks the capsule to the remaining future delta.

## Required Reading

- Layer placement and question-scoped authority: [Docs Layer Model](references/docs-layer-model.md)
- Internal shape and identity admission: [Elastic Shape and Identity](references/elastic-shape-and-identity.md)
- Current, accepted target, and future claims: [Current vs Future](references/current-vs-future.md)
- Roadmap capsules and promotion: [Roadmap and Future Capsules](references/roadmap-and-future-capsules.md)
- Source/docs bidirectional alignment: [Source-Code Alignment](references/source-code-alignment.md)
- Retention, migration, flattening, and deletion: [Lifecycle and Cleanup](references/lifecycle-cleanup.md)
- Human-agent operating flow: [Human-Agent SOP](references/human-agent-sop.md)
- Optional graph metadata: [Artifact Graph](references/artifact-graph.md)

## Deterministic Audit

```bash
python3 scripts/run_docs_audit.py --repo <repo>
python3 scripts/scan_docs_structure.py --repo <repo>
python3 scripts/scan_docs_links.py --repo <repo>
python3 scripts/scan_source_doc_anchors.py --repo <repo>
python3 scripts/scan_future_capsules.py --repo <repo>
python3 scripts/scan_artifact_graph.py --repo <repo>
```

Structural findings are review signals unless they expose duplicate authority, duplicate identity, a broken current route, or a shadow authority chain. Scripts suggest; semantic judgment moves files.

## Output

Return:

```text
classification table
placement/retention decisions
shape and identity admissions
moves/deletions/additions/flattening
current, target, and future authority changes
source/evidence backlinks
index/link updates
audit results, deliberate exceptions, and unresolved decisions
```

Documentation convergence proves terminology, routing, and ownership only. Report implementation, test, migration, runtime, browser, or production claims only when the owning evidence exists.
