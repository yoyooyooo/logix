---
title: AGENT-PRESS-001 Medium Model Agent-First Pressure Packet
status: closed-docs-risk
version: 1
---

# AGENT-PRESS-001 Medium Model Agent-First Pressure Packet

## Goal

Use GPT-5.5 medium sub-agents to challenge whether the current frozen API shape remains Agent-first for a model that can follow structure but may overgeneralize names, route families, and public concepts.

This packet does not change public API, does not add a surface candidate, does not start `TASK-003`, and does not modify runtime code.

## Meta

| field | value |
| --- | --- |
| pressure_id | `AGENT-PRESS-001` |
| status | `closed-docs-risk` |
| model_lane | `GPT-5.5 medium` |
| execution_topology | `three sub-agent pressure lanes` |
| decision_outputs | `no-change-proven`, `docs-or-example-task-watch`, `diagnostic-task-watch` |
| owner | `coordination-main-agent` |
| source_reviews | `Form authoring lane`, `React host selector lane`, `runtime verification lane` |

## Sources

- [run-state.md](./run-state.md)
- [capability-atom-pressure-map.md](./capability-atom-pressure-map.md)
- [surface-candidate-registry.md](./surface-candidate-registry.md)
- [api-implementation-gap-ledger.md](./api-implementation-gap-ledger.md)
- [../../ssot/capability/02-api-projection-decision-policy.md](../../ssot/capability/02-api-projection-decision-policy.md)
- [../../ssot/capability/03-frozen-api-shape.md](../../ssot/capability/03-frozen-api-shape.md)
- [../../ssot/form/06-capability-scenario-api-support-map.md](../../ssot/form/06-capability-scenario-api-support-map.md)
- [../../ssot/form/08-capability-decomposition-api-planning-harness.md](../../ssot/form/08-capability-decomposition-api-planning-harness.md)
- [../../ssot/form/13-exact-surface-contract.md](../../ssot/form/13-exact-surface-contract.md)
- [../../ssot/runtime/01-public-api-spine.md](../../ssot/runtime/01-public-api-spine.md)
- [../../ssot/runtime/09-verification-control-plane.md](../../ssot/runtime/09-verification-control-plane.md)
- [../../ssot/runtime/10-react-host-projection-boundary.md](../../ssot/runtime/10-react-host-projection-boundary.md)
- [../../ssot/runtime/13-selector-type-safety-ceiling-matrix.md](../../ssot/runtime/13-selector-type-safety-ceiling-matrix.md)
- `.codex/skills/logix-capability-planning-loop/references/taste.md`

## Slice Manifest

| field | value |
| --- | --- |
| target_scenarios | `SC-A`, `SC-B`, `SC-C`, `SC-D`, `SC-E`, `SC-F` |
| target_caps | `CAP-01..CAP-26`, `VOB-01..VOB-03` |
| related_projections | `PROJ-01..PROJ-07` |
| related_collisions | `COL-01..COL-08`, with main pressure on `COL-01`, `COL-02`, `COL-03`, `COL-04`, `COL-05`, `COL-06`, `COL-07`, `COL-08` |
| required_proofs | `PF-01..PF-09` |
| coverage_kernel | `minimal-generator-first`, `one-owner-per-atom`, `surface-candidate-ledger`, `global-closure-before-total-shape` |
| decision_policy | P0 hard laws, concept-count, public-surface, generator efficiency, proof-strength, type-safety ceiling, first-read clarity, Agent generation stability |
| non_claims | no exact spelling freeze, no runtime code change, no new `SURF-*`, no root compare productization |
| generator_hypothesis | The shape remains Agent-first if a medium model can choose owner lanes and host/control-plane routes without inventing public concepts. |

## Pressure Lanes

| lane | target | sub-agent verdict | closed decision |
| --- | --- | --- | --- |
| Form authoring | `Form.make`, `field.rule`, `field.source`, `field.companion`, `root`, `list`, `submit` | `acceptable-with-docs-risk` | no public source, fact, options, final-truth, manual refresh, or config shortcut concept |
| React host selector | `useModule`, `useSelector`, `fieldValue`, `Form.Error.field`, `Form.Companion.field/byRowId` | `acceptable-with-docs-risk` | no Form hook family, public path builder, carrier-bound selector, row owner token, or second host gate |
| runtime verification | `runtime.check`, `runtime.trial`, `runtime.compare`, `fixtures/env + steps + expect`, `VerificationControlPlaneReport` | `acceptable-with-docs-risk` | no public scenario carrier, second report object, raw evidence default compare, benchmark truth owner, or `TASK-003` auto-start |

## Findings

| area | result |
| --- | --- |
| owner lane clarity | Current shape is viable for medium-model generation if prompts and examples preserve the owner lane table: source for remote facts, companion for local soft facts, rule/list/root/submit for final truth, host selector for reads, runtime control plane for verification. |
| public surface pressure | All three lanes found plausible tempting counter-shapes, but each increases concept count, route count, owner ambiguity, or proof cost. |
| Agent generation stability | The frozen shape has fewer branches than the counter-shapes. The main generator rule remains one declaration act, one source lane, one companion lane, one host read gate, one report shell. |
| type honesty | `fieldValue` literal paths and returned-carrier companion typing are honest. `void` callback exact companion typing remains honest-unknown. |
| verification boundary | `fixtures/env + steps + expect` stays verification-only. Report and compare truth stay on the single evidence/report boundary. |
| human and Agent residual | The shape is not frictionless. Medium models are likely to overgeneralize names unless examples carry negative space. |

## Likely Medium Model Failures

| failure | wrong generation | boundary violated |
| --- | --- | --- |
| async companion lower | `async lower(ctx) { return fetchOptions(...) }` | remote facts must enter through `source`; companion is synchronous local soft fact |
| final truth in companion | companion returns `blocking` or `errors` | final truth belongs to rule/list/root/submit |
| source as options API | `field(path).options({ resource, deps })` | remote ingress and local candidate shaping stay separate |
| config declaration shortcut | `Form.make(id, { fields: { ... } })` | `config` and `define` must not become parallel declaration carriers |
| Form-owned React hook | `useCompanion(form, path)` | read route must stay `useSelector(handle, descriptor)` |
| public path builder | `Form.Path.of(schema).items.byId(rowId).field` | current typed path closure does not admit a public path noun |
| carrier as selector | `useSelector(form, returnedCarrier)` | returned carrier is type-only metadata, not a read route |
| public row token | `Form.Row.owner(listPath, rowId)` | row owner stays internal and is consumed through `byRowId` primitives |
| scenario as authoring API | `Form.make(id, { scenarios: [ScenarioPlan.make(...)] })` | scenario plans stay verification control-plane input |
| second report object | `ScenarioReport.from(report)` | report truth stays `VerificationControlPlaneReport` |
| raw evidence compare | `Runtime.compare({ left: a.rawEvidence, right: b.rawEvidence })` | raw evidence is drilldown, not default compare surface |
| compare productization | starting `Runtime.compare` root product work from this pressure | `TASK-003` still requires explicit authority intake |

## Counter-Shape Decisions

| counter-shape | public surface delta | Agent impact | proof cost | decision |
| --- | --- | --- | --- | --- |
| generic `Fact / SoftFact` namespace | new `Form.Fact` or `field(path).fact` | lowers local naming cost, raises owner ambiguity across remote, soft, final, and evidence facts | reopens `COL-01`, `COL-02`, `COL-06`, `COL-08` | rejected |
| list/root companion | new list/root soft fact authoring and read routes | makes cross-row examples look direct, adds owner and route branches | reopens `COL-03`, retouches `PF-03`, `PF-05`, `PF-06`, `PF-08` | rejected unless irreducible roster-owned soft fact appears |
| companion final truth owner | companion returns final verdicts or blocking | easier short generation, breaks final truth explainability | violates P0 single truth and submit backlink constraints | hard rejected |
| source/options merge | remote `options` API or source-owned candidates | improves select demos, narrows source and confuses candidates | reopens `COL-06` | rejected |
| manual source refresh helper | public `refreshSource` or `Form.Source.refresh` | invites ad hoc stale handling and bypasses scheduling law | expands `CAP-06`, `CAP-07`, `CAP-09` proof scope | deferred only by explicit controlled reopen |
| config-level declaration shortcut | `config.fields/rules/sources` | creates equivalent generation routes | risks second declaration carrier | rejected |
| Form hook family | `useFieldValue`, `useCompanion`, `useFormSelector` | doubles read route branches | reopens host selector proof and equality/read law | rejected |
| public `Form.Path` | path builder or schema path namespace | adds a path concept before owner lanes are learned | must prove no second schema/path authority | rejected for current matrix |
| carrier-bound selector route | returned carrier becomes read descriptor | confuses declaration metadata with runtime read owner | needs carrier lifecycle and host equality proof | rejected |
| public row owner token | `Form.Row` or row token descriptor | spreads row token into write/read/source/companion prompts | needs reorder/remove/nested/settle proof | rejected |
| public `ScenarioPlan` | scenario plan as public asset | invites verification scenario as business authoring | reopens `PF-08` and `SURF-002` boundary | rejected |
| second report object | `ScenarioReport`, stage-specific report families | adds report family choice and merge rules | reopens `COL-05` | rejected |
| raw evidence default compare | raw evidence enters compare protocol | creates unstable diff generation | reopens `COL-07`, `PF-09` | rejected |
| root compare productization now | productized root compare route | turns compare into default correctness/perf owner | requires `TASK-003` authority intake | deferred |

## Status Quo Burden

| burden | result |
| --- | --- |
| readable | The combined route is readable as declaration through Form DSL, reads through host selector descriptors, verification through runtime control plane. |
| generatable | Medium models have one main path per responsibility. Wrong paths are mostly tempting convenience routes already named in negative space. |
| internally honest | No hidden second submit truth, evidence envelope, report object, host read family, metadata object, row owner token, or scenario authoring surface is needed. |
| testable | Current proof gates remain `PF-01..PF-09`; no new implementation proof is required for this evaluation slice. |
| teachable | Teaching burden remains. The canonical examples must show owner-lane choice, returned-carrier exact typing, single selector gate, and verification stage boundaries. |

Decision: `no-change-proven` for public shape, with `docs-or-example-task-watch` and `diagnostic-task-watch`.

## Follow-Up Watch

| follow-up | status | trigger |
| --- | --- | --- |
| owner-lane decision table | `watch` | generated examples repeatedly confuse `source`, `companion`, and final truth |
| async companion diagnostic | `watch` | users or generated code place remote IO in `lower` |
| companion final-truth diagnostic | `watch` | generated code returns final blocking from companion |
| returned-carrier exact typing examples | `watch` | generated code expects exact companion selector typing from `void` callback |
| selector negative examples | `watch` | generated code introduces `useCompanion`, `Form.Path`, carrier reads, or row tokens |
| verification stage examples | `watch` | generated code treats scenario protocol as authoring API or raw evidence as compare input |
| compare productization boundary | `watch` | generated code starts `Runtime.compare` root productization without explicit `TASK-003` request |

## Control-Plane Delta

| target | delta |
| --- | --- |
| [capability-atom-pressure-map.md](./capability-atom-pressure-map.md) | add `AGENT-PRESS-001` as closed medium-model Agent-first pressure |
| [run-state.md](./run-state.md) | update cursor to closed pressure and return to watch-only |
| [surface-candidate-registry.md](./surface-candidate-registry.md) | no new candidate; existing rejected and not-admitted counter-shapes remain sufficient |
| [api-implementation-gap-ledger.md](./api-implementation-gap-ledger.md) | no row status change |
| authority pages | no authority writeback required |

## Reopen Latch

| field | value |
| --- | --- |
| latched_decision | `no-change-proven` with docs and diagnostics watch |
| reopen_evidence | repeated medium-model generated failures across at least two lanes, proof that examples cannot stabilize generation without wrappers, or implementation evidence that current shape needs a hidden public concept |
| settled_arguments | generic fact namespace, Form hooks, public path builder, carrier-bound selector, row token, public scenario carrier, second report object, raw evidence default compare, and compare productization cannot reopen by preference alone |
| allowed_followups | docs, examples, diagnostics, implementation proof if an actual generated-code failure recurs |
| forbidden_shortcuts | adding convenience public route before concept admission, using this packet to start `TASK-003`, treating `void` callback exact inference as solved |

## Decision

`AGENT-PRESS-001` closes as `closed-docs-risk`.

The current frozen shape still counts as Agent-first under GPT-5.5 medium pressure. It is not risk-free. The residual risks are generation teaching and diagnostics risks, not public surface blockers.

## Current Sentence

`AGENT-PRESS-001` confirms the frozen API shape remains Agent-first enough for medium-model generation in the current matrix. No public concept is admitted, no global closure is reopened, and `TASK-003` remains deferred behind explicit authority intake.
