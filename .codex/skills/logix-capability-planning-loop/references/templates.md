# Templates

## Default Task Result

```md
## Selected Work Item
- type:
- reason:
- source refs:

## Execution Topology
- mode: `multi-agent`
- coordinator:
- planning_agents:
- review_agents:
- probe_agents:
- fallback_reason:

## Slice Manifest
- target_scenarios:
- target_caps:
- related_projections:
- related_collisions:
- required_proofs:
- coverage_kernel:
- decision_policy:
- non_claims:
- generator_hypothesis:
- pressure_mode:
- capability_bundle:
- cross_pressure_axes:
- current_shape_under_attack:
- forced_counter_shapes:
- status_quo_burden:
- implementation_friction_probe:
- concept_admission_gate:
- dual_audience_pressure:
- overfit_underfit_guard:
- human_status_quo_burden:
- taste_rubric:
- decision_latch:
- final_asset_hygiene:
- process_name_leak_check:
- fixture_boundary:

## Planning Delta
- changed proposal / collision / principle / proof / snapshot / skill feedback:
- surface_candidate_delta:
- implementation_gap_delta:
- implementation_probe_delta:
- probe_artifact_lifecycle_delta:
- pressure_delta:
- counter_shape_delta:
- status_quo_burden_delta:
- dual_audience_pressure_delta:
- human_status_quo_burden_delta:
- taste_rubric_delta:
- overfit_underfit_delta:
- decision_latch_delta:
- final_asset_hygiene_delta:
- process_name_leak_delta:
- fixture_boundary_delta:
- global_closure_delta:
- status_delta:
- next action:

## Validation
- checks run:
- remaining blockers:
```

## Run State Update

```md
## Current Cursor
- execution_topology:
- active_work_item:
- active_phase:
- active_slice:
- active_proposal:
- active_collision:
- active_principle:
- active_proof:
- last_completed_step:
- next_action:
- blocked_by:

## In-flight Artifacts
- proposal:
- review ledger:
- collision:
- principle candidate:
- proof wave:
- surface candidate:
- implementation probe:
- probe artifact lifecycle:
- global closure gate:
- skill feedback:
```

## Slice Manifest

```md
## Slice Manifest

- target_scenarios:
- target_caps:
- related_projections:
- related_collisions:
- required_proofs:
- coverage_kernel:
- decision_policy:
- non_claims:
- generator_hypothesis:
- pressure_mode:
- capability_bundle:
- cross_pressure_axes:
- current_shape_under_attack:
- forced_counter_shapes:
- status_quo_burden:
- implementation_friction_probe:
- concept_admission_gate:
- dual_audience_pressure:
- overfit_underfit_guard:
- human_status_quo_burden:
- taste_rubric:
- decision_latch:
- final_asset_hygiene:
- process_name_leak_check:
- fixture_boundary:
```

## Pressure Packet Template

```md
# CAP-PRESS-<id>: <name>

## Metadata
- status:
- pressure_mode: `adversarial`
- execution_topology:
- coordination_owner:
- planning_agents:
- review_agents:
- probe_agents:
- source_refs:

## Slice Manifest
- target_scenarios:
- target_atoms:
- related_projections:
- related_collisions:
- required_proofs:
- capability_bundle:
- cross_pressure_axes:
- current_shape_under_attack:
- decision_policy:
- non_claims:

## Frozen Shape Candidate
- current_surface:
- current_internal_law:
- assumed_owner_truth:
- expected_sufficiency:
- expected_failure_mode:

## Dual-Audience Pressure
- primary_audience:
- secondary_audience:
- audience_conflict:
- agent_cost:
- human_cost:
- taste_cost:
- tie_breaker:

## Adversarial Witness Bundle
- witness_1:
- witness_2:
- witness_3:
- combined_interaction:
- why_single_atom_pressure_is_insufficient:

## Forced Counter-Shapes

### Counter-Shape A: <name>
- public_surface_delta:
- owner_truth_placement:
- first_read_impact:
- generator_impact:
- implementation_sketch:
- proof_requirement:
- concept_count_delta:
- public_surface_delta_score:
- taste_rubric_score:
- overfit_risk:
- underfit_risk:
- rejection_or_adoption_reason:

### Counter-Shape B: <name>
- public_surface_delta:
- owner_truth_placement:
- first_read_impact:
- generator_impact:
- implementation_sketch:
- proof_requirement:
- concept_count_delta:
- public_surface_delta_score:
- taste_rubric_score:
- overfit_risk:
- underfit_risk:
- rejection_or_adoption_reason:

## Status Quo Burden
- combined_witness_authoring:
- first_read_verdict:
- agent_generation_verdict:
- no_hidden_second_truth:
- no_second_report_or_evidence_envelope:
- no_second_read_route:
- proof_strength:
- implementation_gap_impact:
- authority_consistency:

## Human Status Quo Burden
- first_read_walkthrough:
- teaching_burden:
- memory_load:
- owner_lane_guessability:
- error_recoverability:
- docs_or_example_support:
- discomfort_classification:

## Taste Rubric
- symmetry:
- locality:
- name_honesty:
- route_count:
- concept_density:
- progressive_disclosure:
- negative_space:
- error_recoverability:
- example_integrity:

## Overfit / Underfit Guard
- overfit_signals:
- underfit_signals:
- evidence_scope:
- verdict:

## Implementation Friction Probe
- probe_required:
- friction_signals:
- probe_scope:
- touched_internal_modules:
- touched_tests:
- proves:
- does_not_prove:
- lifecycle:
- decision:

## Final Asset Hygiene
- production_name_check:
- formal_test_file_name_check:
- fixture_or_harness_boundary:
- traceability_ids:
- renamed_files:
- deleted_or_demoted_files:
- remaining_process_names:
- hygiene_outcome:
- reopen_bar:

## Concept Admission Gate
- cannot_express_current_matrix:
- materially_worse_authoring:
- hidden_second_truth_required:
- recurring_gap_across_slices:
- replaces_multiple_local_patches:
- admission_verdict:

## Decision
- pressure_decision:
- human_pressure_decision:
- surface_candidate_delta:
- implementation_gap_delta:
- collision_delta:
- principle_candidate_delta:
- authority_writeback:
- next_action:

## Decision Latch
- latched_decision:
- reopen_evidence:
- settled_arguments:
- allowed_followups:
- forbidden_shortcuts:

## Review
- reviewer_challenge_to_status_quo:
- reviewer_challenge_to_counter_shapes:
- reviewer_challenge_to_human_burden:
- reviewer_challenge_to_taste_rubric:
- reviewer_challenge_to_latch:
- remaining_blockers:
```

## Proposal Template

```md
# Proposal: <name>

## Metadata
- status:
- execution_topology:
- coordination_owner:
- review_ledger:

## Target
- target_scenarios:
- claimed_caps:
- excluded_caps:
- target_projection:
- authority_touchpoints:

## Decision Policy Check

### P0 Hard Laws
- violated:
- touched:

### P1 Strong Preferences
- improved:
- weakened:
- proof for weakening:

### Generator Efficiency
- public_concepts:
- covered_caps:
- covered_scenarios:
- collisions_introduced:
- generator_verdict:

### P2 Tradeoffs
- chosen compromise:
- rejected alternatives:

### Human First-Read
- first-read win:
- first-read cost:
- teaching burden:
- memory load:

### Agent-First
- generation stability:
- validation stability:

### Taste Fitness
- symmetry:
- locality:
- name_honesty:
- route_count:
- concept_density:
- progressive_disclosure:
- negative_space:
- example_integrity:
- overfit_underfit_verdict:

## Shape
- lane-level design:
- exact surface status:
- surface_candidate_refs:
- non_claims:

## Coverage
- covered_caps:
- uncovered_caps:
- residual_risks:

## Collision
- touched_col:
- new_col:
- conflicting_proposals:

## Proof
- required_pf:
- proof_status:
- missing_evidence:

## Adversarial Pressure
- pressure_mode:
- capability_bundle:
- cross_pressure_axes:
- current_shape_under_attack:
- forced_counter_shapes:
- status_quo_burden:
- implementation_friction_probe:
- concept_admission_gate:
- dual_audience_pressure:
- human_status_quo_burden:
- taste_rubric:
- overfit_underfit_guard:
- decision_latch:
- pressure_decision:

## Principle Candidates
- principle_candidates:

## Review
- plan_optimality_ledgers:
- current_status:
- adoption_request:

## Surface Candidate Delta
- candidate_ids:
- public_concepts:
- owning_projection:
- covered_caps:
- covered_scenarios:
- public_surface_delta:
- generator_verdict:
- proof_state:
- authority_target:
- status:

## Implementation Gap Delta
- touched_api_items:
- authority_status_delta:
- runtime_status_delta:
- type_status_delta:
- proof_status_delta:
- gap_kind_delta:
- current_gap_delta:
- next_route_delta:

## Implementation Probe Delta
- probe_required:
- probe_scope:
- touched_internal_modules:
- touched_tests:
- proves:
- does_not_prove:
- probe_status:
- promotion_decision:

## Probe Artifact Lifecycle Delta
- artifact_paths:
- current_lifecycle_state:
- naming_scope:
- naming_review:
- keep_generalize_demote_delete:
- cleanup_trigger:
- final_owner_candidate:
- retained_tests:

## Pressure Delta
- pressure_mode:
- target_atoms:
- capability_bundle:
- cross_pressure_axes:
- pressure_decision:
- reviewer_status:
- next_pressure_route:

## Counter-Shape Delta
- counter_shape_ids:
- public_surface_deltas:
- owner_truth_placements:
- concept_count_deltas:
- proof_requirements:
- rejection_or_adoption_reasons:
- surface_candidate_updates:

## Status Quo Burden Delta
- first_read_verdict:
- agent_generation_verdict:
- no_hidden_second_truth:
- no_second_report_or_evidence_envelope:
- no_second_read_route:
- combined_witness_proof:
- residual_status_quo_risks:

## Dual Audience Pressure Delta
- primary_audience:
- secondary_audience:
- audience_conflict:
- agent_cost_delta:
- human_cost_delta:
- taste_cost_delta:
- tie_breaker:

## Human Status Quo Burden Delta
- first_read_walkthrough:
- teaching_burden:
- memory_load:
- owner_lane_guessability:
- error_recoverability:
- docs_or_example_support:
- discomfort_classification:

## Taste Rubric Delta
- symmetry:
- locality:
- name_honesty:
- route_count:
- concept_density:
- progressive_disclosure:
- negative_space:
- error_recoverability:
- example_integrity:

## Overfit / Underfit Delta
- overfit_signals:
- underfit_signals:
- evidence_scope:
- verdict:

## Decision Latch Delta
- latched_decision:
- reopen_evidence:
- settled_arguments:
- allowed_followups:
- forbidden_shortcuts:

## Global Closure Delta
- closure_scope:
- passed:
- failed_items:
- next_work_item:

## Skill Feedback
- feedback_id:
- source_context:
- observed_gap:
- proposed_skill_change:
- affected_files:
- evidence:
- reuse_scope:
- risk_if_added:
- risk_if_ignored:
- recommended_status:
```

## Portfolio Row

```md
| proposal id | status | target caps | target projection | generator verdict | conflicts | required principles | review ledger | next action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
```

## Principle Candidate

```md
| principle id | source collisions | principle statement | affected caps | affected projections | authority target | status |
| --- | --- | --- | --- | --- | --- | --- |
```

## Skill Feedback Packet

```md
| field | content |
| --- | --- |
| feedback_id | stable id |
| source_context | proposal / collision / proof / review ledger that produced the feedback |
| observed_gap | what the skill or SSoT failed to guide |
| proposed_skill_change | exact workflow/template/rule change |
| affected_files | skill, template, SSoT, portfolio, or snapshot files |
| evidence | links or ids that prove recurrence or leverage |
| reuse_scope | one proposal / one domain / cross-domain |
| risk_if_added | how this could overfit or overconstrain future work |
| risk_if_ignored | how future agents may keep failing |
| recommended_status | candidate / promote-to-skill / promote-to-ssot / promote-to-template / reject |
```

## Surface Candidate Row

```md
| candidate id | status | public concept | owner projection | covered caps | covered scenarios | sources | public surface delta | generator verdict | proof state | authority target | next action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
```

## Implementation Probe Ledger

```md
## Meta

| field | value |
| --- | --- |
| artifact_kind | `implementation-probe` |
| proof_gate | `PF-* / VOB-*` |
| status | `probe-local / discarded / promoted-to-principle / authority-requested / converted-to-implementation-task` |
| decision_question | |

## Scope

- target_scenarios:
- target_caps:
- related_projection:
- touched_internal_modules:
- touched_tests:
- non_claims:

## What This Proves

-

## What This Does Not Prove

-

## Promotion Decision

- decision:
- required_writeback:
- next_action:

## Artifact Lifecycle

- artifact_paths:
- lifecycle_state:
- naming_scope:
- naming_review:
- keep_generalize_demote_delete:
- cleanup_trigger:
- final_owner_candidate:
- retained_tests:
```

## Global API Shape Closure Gate

```md
## Closure Scope
- scenario_scope:
- proposal_set:
- registry_version:
- authority_targets:

## Gate Result
- passed:
- failed_items:
- next_work_item:

## Checks
- scenario_coverage:
- cap_owner_coverage:
- projection_status:
- collision_status:
- proof_status:
- surface_candidate_status:
- authority_writeback_status:
- principle_backpropagation:
- snapshot_sync:
- housekeeping_status:
```

## Shape Snapshot Section

```md
## SC-X: scenario name

Status: proposal snapshot / baseline projection / authority-linked
Source: PROP-xxx, PROJ-xxx
Exact authority: pending / owner file
Open collisions: COL-xxx

### Current writing shape
Short code-like sketch or lane-level snippet.

### What it demonstrates
- CAP-xx
- CAP-yy

### Open questions
- ...
```
