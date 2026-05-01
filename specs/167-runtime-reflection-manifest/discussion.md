# Discussion: 167 Runtime Reflection Manifest Risk Ledger

**Status**: Revised after plan-optimality-loop Round 1  
**Date**: 2026-04-29  
**Authority refs**: [spec](./spec.md), [plan](./plan.md), [tasks](./tasks.md), [166 discussion](../166-playground-driver-scenario-surface/discussion.md), [product SSoT](../../docs/ssot/runtime/17-playground-product-workbench.md)

## Review Result

Round 1 did not pass `implementation-ready`.

Adopted direction:

- 167 must split immediate closure from terminal reflection ambitions.
- 167A unblocks 166 with minimum manifest, consumption law, fallback classification and public sweep.
- 167B keeps full manifest, richer payload validation, CLI/Devtools reuse and observability collection as later terminal work.
- Observability in this planning round is reduced to an event and coordinate law. Collection hooks, batch buffering and hot-path perf evidence need a separate closure gate or later spec.
- Cross-tool consumption needs a smaller law than a broad DTO.

## 167A And 167B Split

| Track | Purpose | Required for 166 G0/G2 | Closure |
| --- | --- | --- | --- |
| 167A | Minimum manifest and cross-tool consumption law | yes | Action authority can replace regex in Playground without public API export |
| 167B | Full reflection terminal surface | no | Full Program manifest, payload validation depth, CLI/Devtools reuse, observability collection and 165 bridge hardening |

167A immediate closure contains:

- `MinimumProgramActionManifest`
- action tag, payload kind, optional summary, authority and digest
- `fallback-source-regex` classification as evidence gap
- no consumer-owned private manifest schema
- public API negative sweep
- first Cross-tool Consumption Law

167B terminal tail contains:

- full Program manifest
- payload schema summary and validation projection depth
- manifest diff
- CLI trial/run/check export
- Devtools reuse
- observability collection and disabled-mode overhead evidence
- deeper 165 bridge integration

## Cross-Tool Consumption Law

Any fact consumed across Playground, CLI, Devtools or 165 bridge must be classified into one of these categories:

| Class | Meaning | Owner | Examples |
| --- | --- | --- | --- |
| `authority` | owner-approved fact that can drive shared interpretation | 167 or existing Runtime/control-plane owner | minimum manifest action tag, manifest digest, check/trial report verdict |
| `contextRef` | host or source context used to explain authority | host owner, usually 166 for Playground | project id, source path, revision, selected file |
| `debugEvidence` | bounded evidence useful for explanation, not verdict | 167 event law or Runtime/control-plane exporter | accepted/completed operation event, trace ref |
| `hostViewState` | UI-only selection and layout state | consumer | selected tab, panel size, active editor |
| `evidenceGap` | explicit missing, degraded, stale or unsupported evidence | producing adapter | missing manifest, unknown schema, stale operation result |

Forbidden classifications:

- Driver declaration as `authority`
- Scenario declaration as `authority`
- Scenario `expect` as compare truth
- payload schema summary as diagnostic finding by itself
- host UI state as Runtime or reflection authority

## Event And Coordinate Law

167 keeps the first event vocabulary small:

```text
operation.accepted
operation.completed
operation.failed
evidence.gap
```

Each operation event may carry:

- `operationKind`: `dispatch | run | check | trial`
- stable operation coordinate
- bounded message
- bounded attachment refs for state, logs or trace
- host context refs when supplied by a host

State snapshots, logs and trace payloads are attachments or refs. They are not separate event families in the first law.

Collection hooks, buffering, batching and disabled-mode perf evidence are 167B or follow-up work. 167A only needs enough event law to keep Playground, CLI and Devtools from inventing incompatible operation vocabularies.

## Payload Ownership Law

Consumer ownership:

- text input
- JSON parse
- UI presentation
- local product input failure for invalid JSON text

167 ownership:

- JSON value against reflected schema
- payload kind
- payload summary
- validator availability
- `PayloadValidationIssue` path, code and bounded message
- unknown schema evidence gap

Until 167 validation is available, 166 can show `validation unavailable` or evidence gap. 166 must not define stable schema validation issue codes.

## 165 Bridge Classification Matrix

| Source | Bridge classification | Notes |
| --- | --- | --- |
| owner-approved manifest | `authority` or `contextRef` depending on 165 contract | never executes Program |
| Runtime run output | `authority` from Runtime output | produced by existing Runtime face |
| Check/Trial report | `authority` from control plane | verdict remains in report owner |
| operation event | `debugEvidence` | no verdict rewrite |
| missing manifest | `evidenceGap` | no regex promotion |
| unknown payload schema | `evidenceGap` | no fabricated schema |
| truncated payload | `evidenceGap` | bounded output required |
| Driver declaration | forbidden as `authority`; may be `hostViewState` or product metadata | product layer only |
| Scenario result | product output, optionally `debugEvidence` after adapter classification | no compare truth |
| Scenario `expect` failure | product failure | no control-plane verdict rewrite |
| UI layout state | `hostViewState` | never shared authority |

## Risk Index

| Risk | Authority ref | Unresolved question | Closure gate | Owner |
| --- | --- | --- | --- | --- |
| R167-001 oversized terminal closure | 167A/167B split | Is 166 blocked only on 167A? | 167A | 167 |
| R167-002 private manifest schema | Cross-tool Consumption Law | Can consumers render without defining authority DTOs? | 167A | 167 |
| R167-003 observability second truth | Event And Coordinate Law | Are events evidence only, with no verdict rewrite? | 167B or follow-up | 167 |
| R167-004 payload validation duplication | Payload Ownership Law | Does 166 avoid stable validation issue codes? | 167B | 167 plus consumers |
| R167-005 vague 165 bridge | Bridge Classification Matrix | Is every source classified without generic `convertible` escape? | 167B | 167 |
| R167-006 public leakage | spec public sweep | Are reflection/playground roots absent from public API? | 167A and 167B | 167 |
| R167-007 source/product metadata confusion | Cross-tool Consumption Law | Do file paths remain context refs only? | 167A | 167 |

## Applied Planning Patches

These adopted Round 1 deltas have been reflected into `spec.md`, `plan.md`, `tasks.md`, `data-model.md`, `contracts/README.md`, checklist entries and the product SSoT where applicable:

- Mark 167A as the immediate closure required by 166.
- Move full manifest, CLI/Devtools reuse and observability collection into 167B or explicit later gates.
- Replace broad shared-consumption DTO wording with Cross-tool Consumption Law plus small adapter DTOs.
- Limit first event vocabulary to `operation.accepted`, `operation.completed`, `operation.failed` and `evidence.gap`.
- Add Payload Ownership Law to remove Playground private validation schema risk.
- Add 165 Bridge Classification Matrix to contracts.

## Residual Review Questions

Round 2 should only check:

1. Did 167A/167B split reduce implementation closure without weakening terminal direction?
2. Did Cross-tool Consumption Law replace broad DTO interpretation?
3. Did event vocabulary stop observability from becoming second Runtime truth?
4. Did payload and bridge laws remove duplicate ownership?
