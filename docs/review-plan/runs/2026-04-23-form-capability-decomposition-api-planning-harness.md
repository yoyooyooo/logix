# Form Capability Decomposition API Planning Harness Review

## Meta

| field | value |
| --- | --- |
| target | `docs/ssot/form/08-capability-decomposition-api-planning-harness.md` |
| targets | `docs/ssot/form/08-capability-decomposition-api-planning-harness.md`, `docs/ssot/form/06-capability-scenario-api-support-map.md`, `docs/ssot/form/README.md`, `docs/ssot/README.md` |
| source_kind | `file-ssot-contract` |
| reviewers | `A1 Ramanujan`, `A2 Kolmogorov`, `A3 Godel`, `A4 objective-function` |
| round_count | `2` |
| challenge_scope | `open` |
| consensus_status | `achieved` |

## Bootstrap

| field | value |
| --- | --- |
| target_complete | yes |
| artifact_kind | `ssot-contract` |
| review_goal | `design-closure` |
| target_claim | `08` 是从 `06` 的 `SC-*` 主场景矩阵派生 capability atoms、planning projection、internal enabler、proof harness、verification obligation 与 collision ledger 的中间 SSoT，可支撑多 Agent API 设计压力测试，同时不创建第二场景矩阵，也不冻结 exact surface |
| challenge_scope | `open` |
| ledger_path | `docs/review-plan/runs/2026-04-23-form-capability-decomposition-api-planning-harness.md` |
| writable | yes |

### Review Object Manifest

| field | value |
| --- | --- |
| source_inputs | user request to decompose `06` capability planning harness with `plan-optimality-loop` |
| materialized_targets | `docs/ssot/form/08-capability-decomposition-api-planning-harness.md` |
| authority_target | `docs/ssot/form/08-capability-decomposition-api-planning-harness.md` |
| bound_docs | `docs/ssot/form/06-capability-scenario-api-support-map.md`, `docs/ssot/form/README.md`, `docs/ssot/README.md` |
| derived_scope | Form capability decomposition and API planning harness |
| allowed_classes | capability atom, planning projection, internal enabler, proof harness, verification obligation, collision ledger, agent proposal delta, adoption gate |
| blocker_classes | second scenario matrix, second exact authority, unverifiable capability atom, projection freezing public surface, collision ledger without close predicate, subagent output without synthesis contract |
| ledger_target | this file |

## Kernel Council

| member | gate |
| --- | --- |
| Ramanujan | reduce concept count, remove redundant layers, keep atoms small |
| Kolmogorov | reduce duplicate status and proof ledgers |
| Godel | block second authority, second workflow, and unclosed contradictions |

## Dominance Axes

- `concept-count`
- `public-surface`
- `compat-budget`
- `migration-cost`
- `proof-strength`
- `future-headroom`

## Assumptions

| id | summary | status | resolution_basis |
| --- | --- | --- | --- |
| `ASM-01` | `06` remains the only scenario matrix | `kept` | `08` now only keeps `SC-* -> CAP-* / VOB-*` decomposition and sends scenario status/proof/reopen back to `06` |
| `ASM-02` | capability atom must have one primary owner lane | `kept` | `CAP-*` catalog now requires `primary owner lane`, `depends_on`, `observable invariant`, `proof gate`, and `anti-goal` |
| `ASM-03` | API planning projection must avoid exact authority | `kept` | `API-*` was replaced by `PROJ-*` lane projection with `authority_target` and `surface commitment` |
| `ASM-04` | collision records need close predicates | `kept` | `COL-*` now has `decision question`, `owner`, `close predicate`, `required proof`, `surviving alternatives`, and `blocked candidate` |
| `ASM-05` | subagent output needs a synthesis-ready delta contract | `kept` | Agent Proposal Delta Contract now requires projection, enabler, collision, proof, status, authority, dominance, assumptions, non-claims, rejected alternatives, adoption request, and residual risks |

## Rounds

### Round 1 Challenge

| finding id | severity | class | summary | status |
| --- | --- | --- | --- | --- |
| `F1` | blocker | invalidity | `API Projection Matrix` used concrete spelling and adopted language, creating second exact authority risk | `closed` |
| `F2` | blocker | ambiguity | several `CAP-*` entries were bundles across multiple owner lanes | `closed` |
| `F3` | blocker | invalidity | `Scenario To Capability Matrix` duplicated scenario gap/proof/status owned by `06` | `closed` |
| `F4` | high | invalidity | `CB-*` was an API shadow layer with low information gain | `closed` |
| `F5` | blocker | controversy | `COL-*` lacked close predicate and convergence state machine | `closed` |
| `F6` | blocker | invalidity | Agent Work Protocol lacked enabler, authority, dominance, assumption, and non-claim fields | `closed` |
| `F7` | high | ambiguity | proof predicate mixed anti-goal with observable invariant | `closed` |
| `F8` | medium | ambiguity | status vocabulary was free-form and hard to synthesize | `closed` |

### Counter Proposals

| proposal id | summary | dominance | status |
| --- | --- | --- | --- |
| `CP1` | replace `API-*` with lane-level `PROJ-*` and authority links | `dominates` | `adopted` |
| `CP2` | split `CAP-*` into single-owner atoms with proof gates | `dominates` | `adopted` |
| `CP3` | remove default `CB-*` and keep bundle rationale inside `PROJ-*` | `dominates` | `adopted` |
| `CP4` | add collision close predicates and proof gates | `dominates` | `adopted` |
| `CP5` | add proposal delta contract for subagents | `dominates` | `adopted` |
| `CP6` | separate verification-only obligations into `VOB-*` | `partial` | `adopted` |

### Round 2 Converge

| reviewer | verdict | residual risk |
| --- | --- | --- |
| `A1` | no unresolved findings | `COL-03`, `COL-04`, `COL-05` remain execution-level open items; several `PF-*` remain planned |
| `A2` | no unresolved findings | `authority_target` currently uses short labels; future waves may need stricter path references |
| `A3` | no unresolved findings | open collision and planned proof gates remain next-wave work, not contract blockers |
| `A4` | no unresolved findings | `PF-03` is conditional; `PF-04`, `PF-06`, `PF-08`, `PF-09` are planned and must not be treated as execution evidence |

## Adoption

| field | value |
| --- | --- |
| adopted_candidate | `Capability planning harness v2` |
| lineage | baseline `08` draft -> Round 1 challenge -> synthesized v2 -> Round 2 converge |
| dominance_verdict | adopted candidate improves `proof-strength` and `future-headroom`, reduces duplicate scenario/proof maintenance, keeps `public-surface` unchanged |

### Rejected Alternatives

| alternative | rejection_reason |
| --- | --- |
| keep `API-*` concrete shape table | creates second exact authority risk |
| keep default `CB-*` layer | duplicates `PROJ-*` with low information gain |
| keep scenario gaps/proofs inside `08` | duplicates `06` scenario matrix authority |
| keep five-field agent protocol | insufficient for synthesis, dominance comparison, and authority leak checks |

### Freeze Record

| field | value |
| --- | --- |
| adopted_summary | `08` now owns `CAP-* / PROJ-* / IE-* / PF-* / VOB-* / COL-*` as a planning harness derived from `06` |
| kernel_verdict | passes Ramanujan compression, Kolmogorov ledger reduction, and Godel anti-second-authority gates |
| frozen_decisions | `CAP-*` single owner; `PROJ-*` lane projection; no default `CB-*`; `VOB-*` verification-only; `COL-*` close predicate required; Agent Proposal Delta Contract required; Adoption / Freeze Gate required |
| non_goals | exact public surface freeze, runtime implementation, package API creation, second scenario matrix |
| allowed_reopen_surface | new `SC-*` in `06`; irreducible multi-lane capability; unresolved `COL-*`; proof harness unable to reach planned gate |
| proof_obligations | `PF-03` conditional; `PF-04`, `PF-06`, `PF-08`, `PF-09` planned |
| delta_from_previous_round | removed quasi exact API authority, removed default `CB-*`, removed duplicated scenario gap/proof/status, added mechanical subagent delta contract and closure gates |

## Consensus

| field | value |
| --- | --- |
| all_reviewers_no_unresolved | yes |
| stale_results_excluded | yes |
| better_proposals_processed | yes |
| adopted_freeze_record_saved | yes |
| stop_rule_satisfied | yes |
| latest_target_saved | yes |
| ledger_saved | yes |
| consensus_status | achieved |

## Residual Risk

- `COL-03`, `COL-04`, `COL-05` remain open by design and require later collision review.
- `PF-03` remains conditional.
- `PF-04`, `PF-06`, `PF-08`, `PF-09` remain planned proof gates.
- Current `authority_target` cells use short labels. If future agents need mechanical linking, upgrade them to full file paths.
