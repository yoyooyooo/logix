# Docs Layer Model

This reference defines project-agnostic top-level `docs/*` layers. A project may omit layers it does not need. If a layer exists, keep its semantic owner and authority boundary explicit.

## Root Rule

```text
docs/<layer> = durable document type / authority role
docs/<layer>/<partition> = optional project-specific routing partition
docs/<layer>/<partition>/<details> = free-form only after the partition earns it
```

Top-level layers are stable semantic boundaries. Their internal taxonomy is elastic; see [Elastic Shape and Identity](elastic-shape-and-identity.md).

## Canonical Vocabulary

Use one canonical name for each top-level role. Avoid singular/plural twins and synonym folders for the same authority.

```text
Core:       product, ssot, standards, adr, architecture, roadmap
Idea flow:  goal-proof, proposals, research, reports
Product:    features, design, interface-capabilities, product-harness
Contracts:  protocols, api, security, data
Operations: runbook, evals, releases
```

This vocabulary is a menu, not a required tree.

## Layer Admission

Create a direct child under `docs/` only when all are true:

- it names a durable document role rather than a phase, team, owner, tool, temporary inbox, or personal habit;
- its highest authority differs from existing layers;
- a future reader can choose it without knowing the current roadmap;
- the layer can state `Owns`, `Must Not Own`, entry points, and conflict behavior;
- placing the content inside an existing layer would create durable ambiguity.

File count alone does not earn a top-level layer. Domain-specific complexity belongs inside an existing layer.

## Discouraged Top-level Names

```text
docs/next
docs/tmp
docs/wip
docs/handoff
docs/phase-1
docs/mvp
docs/my-plan
docs/agent-notes
docs/old
docs/archive
```

Route temporary or historical material by semantic role and lifecycle, not by age or project phase.

## Layer Responsibilities

| Layer | Owns | Must not own |
|---|---|---|
| `product` | durable positioning, users, value, principles, non-goals | implementation progress, detailed contracts |
| `features` | detailed user-facing requirements and acceptance scope when the repo needs a dedicated layer | cross-feature shared truth, code completion claims |
| `ssot` | current shared objects, terms, invariants, states, business/domain facts | future complete models, page-specific interaction prose |
| `standards` | enforceable rules, commands, checks, authoring or engineering discipline | aspirations with no current applicability |
| `adr` | accepted technical tradeoffs and consequences | product/business decisions unless the repository deliberately broadens ADR scope |
| `architecture` | current topology, boundaries, accepted seams, deployment shape | product behavior authority, task progress |
| `protocols` / `api` | adopted exchange contracts and usage contracts | roadmap intent, implementation checklist |
| `design` | information architecture, interaction, visual and component behavior | domain truth and backend implementation detail |
| `roadmap` | sequence, prerequisites, gates, capability routes | copied tracker status, shadow SSoT/ADR/Architecture |
| `reports` | durable audit, delivery, experiment, migration, or validation evidence | current authority merely because a report is recent |
| `runbook` | operational procedures and recovery actions | product meaning and design intent |
| `security` | security posture, threat model, sensitive-data rules | general feature scope without security ownership |
| `data` | data model, lineage, retention mechanics, migrations | product priority or user journey |

## Question-scoped Authority

A single global conflict list is often misleading. Determine authority by the question.

```text
What should the product or system do?
  accepted product/business decision
  -> baselined requirement/feature contract
  -> shared SSoT constraint
  -> source input / current implementation evidence

What does the current system actually do?
  runtime evidence
  -> tests and generated evidence
  -> schema/migrations
  -> source code
  -> current architecture description

What does a shared term, state, or invariant mean?
  SSoT
  -> accepted requirement/decision
  -> source material
  -> code naming

Why was a choice made?
  product/business decision record for product choices
  -> ADR for technical choices

What does an interface accept?
  adopted protocol/OpenAPI/schema
  -> contract tests
  -> implementation

What is in progress or complete?
  the repository's selected tracker/spec/evidence method
  -> release evidence
```

Each repository should record local exceptions in `docs/README.md` without creating duplicate authority.

## Layer README Contract

A durable top-level layer README should state:

- `Owns`;
- `Must Not Own`;
- `Read Next` or current entry points;
- conflict behavior when the layer is authority-heavy;
- promotion/demotion or retention rules when relevant.

A child partition README is a local router. It normally states scope, contents, read order, and genuine local exceptions. It inherits authority from its parent and should not restate a competing global contract.

## Host Language

Follow the nearest repository language policy for narrative prose. Keep machine-facing fields, commands, paths, schemas, code symbols, canonical status values, and portable templates stable when English improves interoperability.
