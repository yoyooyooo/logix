---
title: HUMAN-PRESS-001 First Read Acceptance Taste Pressure Packet
status: no-change-human-burden-met
version: 2
---

# HUMAN-PRESS-001 First Read Acceptance Taste Pressure Packet

## Goal

Challenge the frozen API shape from human first-read, adoption friction, and API taste after capability coverage has closed.

This packet uses `.codex/skills/logix-capability-planning-loop/references/taste.md`. It does not freeze exact surface, does not add a public concept, and does not start `TASK-003`.

## Meta

| field | value |
| --- | --- |
| pressure_id | `HUMAN-PRESS-001` |
| status | `no-change-human-burden-met` |
| decision_outputs | `no-change-human-burden-met`, `docs-or-example-task` |
| owner | `coordination-main-agent` |
| source_reviews | `Newton planning slice`, `Erdos adversarial review` |

## Sources

- [run-state.md](./run-state.md)
- [capability-atom-pressure-map.md](./capability-atom-pressure-map.md)
- [surface-candidate-registry.md](./surface-candidate-registry.md)
- [shape-snapshot.md](./shape-snapshot.md)
- [../../ssot/capability/01-planning-harness.md](../../ssot/capability/01-planning-harness.md)
- [../../ssot/capability/02-api-projection-decision-policy.md](../../ssot/capability/02-api-projection-decision-policy.md)
- [../../ssot/capability/03-frozen-api-shape.md](../../ssot/capability/03-frozen-api-shape.md)
- [../../ssot/form/06-capability-scenario-api-support-map.md](../../ssot/form/06-capability-scenario-api-support-map.md)
- [../../ssot/form/08-capability-decomposition-api-planning-harness.md](../../ssot/form/08-capability-decomposition-api-planning-harness.md)
- [../../ssot/form/13-exact-surface-contract.md](../../ssot/form/13-exact-surface-contract.md)
- `.codex/skills/logix-capability-planning-loop/references/taste.md`

## Slice Manifest

| field | value |
| --- | --- |
| target_scenarios | `SC-C`, `SC-E`, `SC-F`; `SC-D` as final-truth pressure |
| target_caps | `CAP-10`, `CAP-11`, `CAP-12`, `CAP-13`, `CAP-19`, `CAP-20`, `CAP-21`, `CAP-22`, `CAP-23`, `CAP-24`, `CAP-25`, `CAP-26`; overlay `CAP-14`, `CAP-17`, `CAP-18` |
| related_projections | `PROJ-03 field-local soft fact lane`, `PROJ-05 row identity operation lane`, `PROJ-06 host selector gate lane`, `PROJ-07 verification control lane` |
| related_collisions | `COL-03`, `COL-04`, `COL-05`, `COL-08` remain closed for current matrix |
| required_proofs | `PF-03`, `PF-05`, `PF-06`, `PF-07`, `PF-08`; no new proof claimed |
| coverage_kernel | `one-owner-per-atom`, `minimal-generator-first`, `adversarial-pressure-required`, `surface-candidate-ledger`, `global-closure-before-total-shape` |
| decision_policy | P0 laws, concept-count, public-surface, Agent generation stability, proof strength, first-read clarity, taste refinement |
| non_claims | no exact spelling freeze, no new scenario id, no public path noun, no Form-owned hook family, no public row owner token, no root compare productization, no public verification-artifact vocabulary |
| generator_hypothesis | current shape keeps one authoring act, one companion namespace, one host selector gate, and type-only returned-carrier metadata without adding public runtime nouns |

## Pressure Mode

| field | value |
| --- | --- |
| pressure_mode | `adversarial + dual-audience taste pressure` |
| capability_bundle | local soft fact + row owner continuity + selector read route + evidence/read diagnostics + returned-carrier type route |
| cross_pressure_axes | companion owner, row active-shape owner, host selector read route, reason/evidence read route, teaching/typing route |
| current_shape_under_attack | `field(path).companion({ deps, lower })`, `Form.Companion.field(path)`, `Form.Companion.byRowId(listPath, rowId, fieldPath)`, `Form.Error.field(path)`, `useSelector(handle, selector)`, returned-carrier exact typing, imperative `void` callback honest-unknown |
| forced_counter_shapes | public `Form.Path`, Form-owned hook family, list/root companion, public row owner token, generic `Fact / SoftFact`, void callback auto-collection, carrier-bound selector route |
| status_quo_burden | current route must stay readable, generatable, internally honest, and testable for the combined human proof sample |
| implementation_proof_route | not required now; diagnostic follow-up only if human-facing errors prove unclear |
| concept_admission_gate | no new public concept unless repeated human failure or proof failure crosses the taste reference reopen bar |
| dual_audience_pressure | Agent-first remains primary; human acceptance is required secondary pressure |
| overfit_underfit_guard | public changes for taste require repeated cross-scenario evidence, not one nicer example |
| human_status_quo_burden | no-change must prove teachability and route remaining discomfort to docs, examples, or diagnostics |
| taste_rubric | symmetry, locality, name honesty, route count, concept density, progressive disclosure, negative space, error recoverability, example integrity |
| decision_latch | same taste objections cannot reopen without new evidence |

## Pressure Question

Can the frozen API shape remain human-teachable and tasteful under the combined proof of `SC-C + SC-E + SC-F`, with `SC-D` final-truth pressure, while preserving Agent-first generation stability, single owner law, concept-count control, and proof obligations?

## Human Proof Sample

This packet does not create a new `SC-*`. The proof sample combines existing scenario rows:

```ts
const program = Form.make("inventory", config, ($) => {
  const warehouseCarrier = $.field("items.warehouseId").companion({
    deps: ["countryId", "items.warehouseId"],
    lower(ctx) {
      return {
        availability: { kind: "interactive" as const },
        candidates: { items: [{ id: "w1", label: "A" }] },
      }
    },
  })

  $.list("items", { identity: { trackBy: "id" } })
  $.field("items.warehouseId").rule(/* final truth stays rule-owned */)
  $.submit()

  return [warehouseCarrier] as const
})

const form = useModule(program)

const value = useSelector(form, fieldValue("items.0.warehouseId"))
const rowBundle = useSelector(
  form,
  Form.Companion.byRowId("items", rowId, "warehouseId"),
)
const explain = useSelector(form, Form.Error.field("items.0.warehouseId"))

const report = await runtime.trial(program, {
  mode: "scenario",
  fixtures: { env },
  steps,
  expect,
})
```

The reader must be able to infer:

| owner lane | visible route |
| --- | --- |
| companion soft fact owner | `field(path).companion({ deps, lower })` |
| final truth owner | `field(...).rule`, `list`, `submit` |
| row identity owner | `fieldArray(path).*` and internal row owner resolution |
| host read owner | `useSelector(handle, descriptor)` |
| error/explain route | `Form.Error.field(path)` as field explain selector |
| verification boundary | `runtime.trial` report as control-plane output |

## Expected Failure Modes

| failure mode | pressure consequence |
| --- | --- |
| first-read cannot identify owner lanes | users put final truth into `companion` or treat selector primitives as truth owners |
| read/write symmetry feels broken | `fieldArray(...).byRowId` and `Form.Companion.byRowId` appear unrelated, pushing toward public row token pressure |
| selector route feels too generic | users ask for `useCompanion`, `useFieldValue`, or Form-owned hooks |
| returned-carrier typing feels ceremonial | users prefer imperative `void` callback auto-collection even without sound proof |
| evidence/report route feels hidden | users ask for public reason, fact, or evidence nouns because selector plus report looks indirect |
| `Form.Error.field(path)` name feels narrow | users miss that the selector result can explain `error / pending / stale / cleanup / undefined` |
| `companion` name feels vague | users ask for `Fact / SoftFact` or treat companion as final validity owner |

## Dual Audience Pressure

| cost lane | pressure |
| --- | --- |
| agent_cost | Current shape is strong: one authoring act, one companion namespace, one host selector gate, and no duplicate read family. Weak point: returned-carrier exact typing adds a conditional authoring pattern agents must learn. |
| human_cost | Current shape has visible ceremony: `Form.Companion.byRowId(listPath, rowId, fieldPath)` is long, `useSelector` hides Form specificity, and returned carriers require explanation. |
| taste_cost | Current shape scores well on owner honesty and route count, weaker on local beauty and first-read symmetry. The discomfort is containment cost under current evidence. |

Tie-breaker:

| rank | rule |
| --- | --- |
| 1 | P0 hard laws |
| 2 | concept-count |
| 3 | public-surface |
| 4 | Agent generation and validation stability |
| 5 | proof strength |
| 6 | human first-read |
| 7 | taste refinement |

## Forced Counter-Shapes

| counter-shape | public delta | owner / truth placement | first-read impact | Agent impact | implementation sketch | proof requirement | taste score | overfit / underfit | decision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| public `Form.Path` / schema path builder | add `Form.Path`, `Form.path(...)`, or schema-derived path objects accepted by field, selector, and companion | path legality becomes a public carrier beside declaration | improves invalid-path story, but adds a noun before owner lanes are learned | agents choose between string, builder, and typed path | lower path object to current descriptor payload | `PF-07`, no second declaration carrier proof, concept admission | locality up, concept density down, progressive disclosure down | overfit likely; underfit only if repeated invalid-path human failures appear | rejected; reopen only if typed string slots and returned-carrier route fail proof or teaching |
| Form-owned hooks / `useCompanion` family | add `Form.useCompanion`, `useFieldValue`, `useFormSelector`, or React subpath hooks | Form becomes partial host read owner beside core host gate | locally shorter and attractive | creates multiple generation routes and weakens selector law | wrappers delegate to `useSelector(handle, Form.Companion.*)` | `PF-07`, host authority writeback, wrapper equivalence proof | first-read up, route count down, owner honesty down | overfit strong; optimizes demo spelling by duplicating read route | rejected; forbidden unless single host gate fails |
| list/root companion | add `$.list(path).companion`, `$.root(...).companion`, or `Form.Companion.list/root` | soft fact owner moves from field to list/root | makes roster-level examples look direct | agents must classify field/list/root soft facts and avoid duplicates | add list/root companion store keyed by owner chain | `PF-03`, `PF-05`, `PF-06`, `PF-07`; reopen `COL-03` | roster symmetry up, locality for field facts down, concept density down | overfit unless irreducible roster-owned soft fact appears | rejected for current matrix |
| public row owner token | add `Form.RowOwner`, `form.fieldArray(path).row(rowId)`, or row token passed to reads/writes | row identity becomes public handle | improves visible read/write symmetry and nested disambiguation | agents manage token lifecycle and parent row namespace | expose canonical row resolver as stable token | `PF-05`, `PF-06`, `PF-07`, no second row truth audit | symmetry up, progressive disclosure down, error recoverability mixed | underfit only if current byRowId route cannot teach nested owners | rejected; current proof exits ambiguous nested owners without public token |
| generic `Fact / SoftFact` namespace | add `field(path).fact`, `Form.Fact.*`, or rename companion | local soft fact gets generic public noun | broader name looks reusable | agents must infer remote fact, final fact, soft fact, and evidence fact boundaries | rename or generalize companion descriptors | `PF-03`, `COL-08`, owner-name audit | name breadth up, name honesty down, negative space down | overfit; broader name invites final truth misuse | rejected; `companion` is narrower and safer |
| void callback auto-collection | keep imperative `void` callback while auto-inferring exact companion metadata | exact typing becomes invisible public behavior | best authoring feel | agents can omit returns, but type truth becomes compiler-magic dependent | collect declaration metadata from side-effect calls into `FormProgram` type | type-level proof for ordered and multiple companions, no hidden metadata object, no second authority | example integrity up, error recoverability down if inference fails | underfit possible if returned-carrier teaching repeatedly fails; current proof is absent | rejected as current guarantee; allow future exact authoring-shape reopen with proof |
| carrier-bound selector route | let returned carrier read directly, for example `useSelector(form, warehouseCarrier)` or `useSelector(form, warehouseCarrier.selector)` | carrier shifts from type-only metadata into a selector-like public object | improves locality between declaration and read | agents choose between carrier selector and `Form.Companion.field` descriptor | returned carrier exposes selector descriptor or lowers to one | `PF-03`, `PF-07`, no public metadata object proof | locality up, route count down, negative space down | overfit likely; leaks type carrier toward runtime-ish object | rejected; record as taste counter-shape only |

## Status Quo Burden

| burden | result |
| --- | --- |
| capability burden | Existing pressure packets close companion, row owner, selector gate, evidence/report, and returned-carrier exact typing for current matrix. |
| readability burden | Combined proof sample can be taught as write via domain DSL, read via selector descriptors, verify via runtime report. The route is longer than hooks but stable. |
| generation burden | Current route has fewer branches than counter-shapes. Agents learn one read gate and one companion namespace. |
| no hidden second truth | Existing closure rejects second row truth, second read route, second report object, generic fact truth, and companion final truth. |
| proof burden | `PF-03`, `PF-05`, `PF-06`, `PF-07`, `PF-08` cover the interacting lanes for current matrix; no new proof is claimed. |
| registry burden | `SURF-001` and `SURF-002` stay authority-linked; no new candidate is admitted. |
| authority burden | `13`, `runtime/10`, and `runtime/09` remain consistent with the no-change decision. |
| status quo weakness | Human friction remains around returned-carrier typing, `byRowId` verbosity, `companion` naming, and `Form.Error.field` explain breadth. |

## Human Status Quo Burden

| question | answer |
| --- | --- |
| Can a human identify owner lanes? | Yes, if docs explicitly teach source, companion, rule/submit, active-shape, host selector, and evidence/report as separate lanes. |
| Can the canonical tutorial avoid a second mental model? | Yes, if every read example uses `useSelector(handle, descriptor)` and avoids wrapper helpers. |
| Can users predict where to put soft fact, final truth, row owner, and diagnostics? | Mostly yes. Companion versus final rule needs explicit contrast examples. |
| Is discomfort necessary containment? | Yes for selector gate, row token rejection, and returned-carrier soundness. |
| Are nicer alternatives rejected for concrete reasons? | Yes. Examined alternatives split owner law, add route count, or require unproven type/runtime substrate. |
| What carries remaining friction? | Docs/examples for returned-carrier typing, selector descriptor taxonomy, companion soft fact boundary, row `byRowId` symmetry, and field explain results. Diagnostics may help when `void` callback exact typing is expected but unavailable. |

## Taste Rubric

| axis | judgment |
| --- | --- |
| symmetry | Mixed. `fieldArray(...).byRowId` and `Form.Companion.byRowId` rhyme conceptually but look far apart. No public row token unless recurring failure appears. |
| locality | Good. Companion stays field-local, row owner stays active-shape, host read stays host-owned. |
| name_honesty | Good with teaching. `companion` is less broad than `Fact` and avoids final-truth claims; `Form.Error.field` needs explain-selector teaching. |
| route_count | Strong. One host gate and no Form hook family. |
| concept_density | Strong. Few public concepts cover many caps. |
| progressive_disclosure | Acceptable with returned-carrier teaching. Imperative `void` callback honest-unknown needs clear docs. |
| negative_space | Needs docs. Users will ask for `Form.Path`, `useCompanion`, `Fact`, row tokens, and carrier-bound selectors. |
| error_recoverability | Adequate for runtime routes; type expectation failure around `void` callback should get clearer docs or diagnostics. |
| example_integrity | Must avoid demo-only wrappers. Examples should show real `useSelector` and returned carriers. |

## Overfit / Underfit Guard

| side | signals |
| --- | --- |
| overfit | Public hooks, path builders, row tokens, and generic fact names improve local examples but add owner branches or route count. |
| underfit | Returned-carrier teaching, `Form.Error.field` explain breadth, and row `byRowId` symmetry create real human friction. |
| verdict | Current evidence supports no public API change plus docs/example task. Reopen only with repeated human failure, wrong Agent generation, or proof that current route needs hidden substrate. |

## Concept Admission Gate

| gate | result |
| --- | --- |
| frozen shape cannot express claimed matrix scenario | false |
| current authoring materially worse for Agent generation stability | false |
| current authoring materially worse for human first-read | not proven; friction exists but does not cross reopen bar |
| internal route needs hidden second truth | false |
| same gap recurs across pressure slices without closure | false for current matrix; returned-carrier teaching remains friction, not proof failure |
| new concept replaces multiple local patches and lowers total concept count | false |

Decision: no public concept is admitted from `HUMAN-PRESS-001`.

## Implementation Proof Boundary

Decision: no implementation proof is required for this packet.

| field | value |
| --- | --- |
| proof_status | `not-required` |
| basis | current pressure is human-facing and taste-facing; existing proof packets already cover capability closure |
| trigger_if_reopened | repeated generated code uses forbidden Form hooks; docs cannot teach returned-carrier route without wrappers; nested `byRowId` ambiguity becomes a common user need; `Form.Error.field` explain union produces repeated misreadings |
| allowed_scope_if_triggered | internal/test-backed/artifact-local only |
| lifecycle_requirement | keep, generalize, demote, or delete before any conclusion uses the artifact |

## Follow-Up Routing

| follow-up | status | route |
| --- | --- | --- |
| returned-carrier canonical example | `closed-by-HUMAN-PRESS-001-FU1` | [human-press-001-fu1-docs-teaching-follow-up.md](./human-press-001-fu1-docs-teaching-follow-up.md) |
| selector route table | `closed-by-HUMAN-PRESS-001-FU1` | [human-press-001-fu1-docs-teaching-follow-up.md](./human-press-001-fu1-docs-teaching-follow-up.md) |
| companion soft fact versus final truth contrast | `closed-by-HUMAN-PRESS-001-FU1` | [human-press-001-fu1-docs-teaching-follow-up.md](./human-press-001-fu1-docs-teaching-follow-up.md) |
| row `byRowId` write/read symmetry explanation | `closed-by-HUMAN-PRESS-001-FU1` | [human-press-001-fu1-docs-teaching-follow-up.md](./human-press-001-fu1-docs-teaching-follow-up.md) |
| `Form.Error.field` explain union naming note | `closed-by-HUMAN-PRESS-001-FU1` | [human-press-001-fu1-docs-teaching-follow-up.md](./human-press-001-fu1-docs-teaching-follow-up.md) |
| `void` callback honest-unknown diagnostic | `watch` | diagnostic task only if actual feedback shows unclear downgrade |
| nested `byRowId` ambiguity diagnostic | `watch` | diagnostic task only if actual feedback shows unclear miss behavior |
| `runtime.trial / runtime.compare` control-plane reminder | `closed-by-HUMAN-PRESS-001-FU1` | [human-press-001-fu1-docs-teaching-follow-up.md](./human-press-001-fu1-docs-teaching-follow-up.md) |

## Decision

Current decision: `no-change-human-burden-met + docs-or-example-task`.

Frozen public API shape remains unchanged.

Reason:

- Capability closure already covers the combined lanes.
- Human discomfort is real, but the strongest counter-shapes add public concepts, split owners, or duplicate host read routes.
- Current shape remains more stable for Agent generation and validation.
- The remaining taste burden belongs to docs, examples, and possible diagnostics before any public shape reopen.

## Decision Latch

| field | value |
| --- | --- |
| latched_decision | `no-change-human-burden-met` plus `docs-or-example-task` |
| reopen_evidence | repeated human failure across at least two canonical tutorials or reviews; proof that returned-carrier route cannot be taught without misleading wrappers; proof that `byRowId` read/write symmetry causes wrong code generation; proof that current route needs hidden second substrate |
| settled_arguments | prettier hooks, generic fact naming, public path builder, row owner token, list/root companion, carrier-bound selector, and void auto-collection cannot return by taste alone |
| allowed_followups | docs, examples, diagnostics, or a future human-readability review packet |
| forbidden_shortcuts | `useCompanion`, `Form.Path`, public row token, `Fact/SoftFact`, list/root companion, public metadata object, carrier-bound selector route, void auto-collection without exact authoring-shape proof |

## Control-Plane Writeback

| target | delta |
| --- | --- |
| [capability-atom-pressure-map.md](./capability-atom-pressure-map.md) | add `HUMAN-PRESS-001` as closed human/taste pressure; no public concept admitted |
| [run-state.md](./run-state.md) | cursor remains paused; optional next action is docs/examples teaching follow-up or diagnostic task if feedback appears |
| [surface-candidate-registry.md](./surface-candidate-registry.md) | no new candidate; rejected/not-admitted human/taste counter-shapes recorded |
| [api-implementation-gap-ledger.md](./api-implementation-gap-ledger.md) | no row status change; diagnostic watch does not create an implementation gap |
| authority pages | no authority writeback required |

## Non-claims

- no public API change
- no new `SURF-*`
- no implementation gap row
- no authority writeback
- no runtime code change
- no implementation proof
- no `TASK-003`
- no claim that imperative `void` callback auto-collects exact `Form.Companion.*` metadata

## Current Sentence

`HUMAN-PRESS-001` closes as `no-change-human-burden-met + docs-or-example-task`: the frozen shape remains unchanged after human first-read, acceptance friction, and API taste pressure. Remaining friction is real and should be carried by docs/examples first; diagnostics stay watch-only until actual feedback proves unclear downgrade or ambiguous row-owner behavior.

`HUMAN-PRESS-001-FU1` has consumed the docs/examples teaching task. External docs now carry the selector support route, returned-carrier exact typing, `void` callback honest-unknown, companion soft fact boundary, row `byRowId` read/write symmetry, `Form.Error.field` explain selector, and runtime control-plane boundary.
