---
title: Agent Self Verification Terminal Pressure Matrix Optimality Loop
status: closed
date: 2026-04-27
---

# Agent Self Verification Terminal Pressure Matrix Optimality Loop

## meta

- target: `docs/ssot/runtime/16-agent-self-verification-scenario-matrix.md`
- targets:
  - `docs/ssot/runtime/16-agent-self-verification-scenario-matrix.md`
  - `docs/ssot/runtime/04-capabilities-and-runtime-control-plane.md`
  - `docs/ssot/runtime/09-verification-control-plane.md`
  - `docs/ssot/runtime/14-dvtools-internal-workbench.md`
  - `docs/ssot/runtime/15-cli-agent-first-control-plane.md`
  - `docs/ssot/runtime/README.md`
- source_kind: `file-ssot-contract`
- reviewers: `A1/A2/A3/A4, gpt-5.5 xhigh`
- round_count: 4
- challenge_scope: `open`
- consensus_status: `closed after adopted rewrite`

## bootstrap

- target_complete: true
- alignment_gate:
  - policy: `auto`
  - status: `inferred`
  - resolved_points:
    - Review target is the SSoT matrix for Agent self-verification.
    - Review goal is `design-closure`.
    - Open challenge scope is allowed.
    - Direct edits to target SSoT and bound references are allowed.
    - Ledger is writable under `docs/review-plan/runs/`.
  - open_questions: []
  - confirmation_basis: user explicitly requested `$plan-optimality-loop` after the SSoT matrix was written.
- review_contract:
  - artifact_kind: `ssot-contract`
  - review_goal: `design-closure`
  - target_claim: `16-agent-self-verification-scenario-matrix.md` should be the stable SSoT terminal pressure matrix for Agent daily self-verification, covering Program assembly omissions, service/config/import/provider/host wiring gaps, current executable coverage, CLI route/transport gaps, core/kernel gaps, future scenario/host boundaries, and proof pressure without creating a second public surface or report/evidence truth.
  - target_refs:
    - `docs/ssot/runtime/16-agent-self-verification-scenario-matrix.md`
    - `docs/ssot/runtime/04-capabilities-and-runtime-control-plane.md`
    - `docs/ssot/runtime/09-verification-control-plane.md`
    - `docs/ssot/runtime/14-dvtools-internal-workbench.md`
    - `docs/ssot/runtime/15-cli-agent-first-control-plane.md`
  - non_default_overrides:
    - reviewer_model: `gpt-5.5`
    - reasoning_effort: `xhigh`
    - active_advisors: `A4 target-function challenge`
- review_object_manifest:
  - source_inputs:
    - user request: `走 $plan-optimality-loop 打磨下`
  - materialized_targets:
    - `docs/ssot/runtime/16-agent-self-verification-scenario-matrix.md`
  - authority_target: `docs/ssot/runtime/16-agent-self-verification-scenario-matrix.md`
  - bound_docs:
    - `docs/ssot/runtime/04-capabilities-and-runtime-control-plane.md`
    - `docs/ssot/runtime/09-verification-control-plane.md`
    - `docs/ssot/runtime/14-dvtools-internal-workbench.md`
    - `docs/ssot/runtime/15-cli-agent-first-control-plane.md`
    - `docs/ssot/runtime/README.md`
  - derived_scope: `runtime SSoT family`
  - allowed_classes:
    - stage coverage gaps
    - report contract ambiguity
    - dependency/import taxonomy
    - kernel pressure quality
    - CLI/DVTools boundary consistency
    - scenario future boundary
  - blocker_classes:
    - second stage authority
    - second report schema authority
    - stale scenario-as-implemented wording
    - unclear owner boundaries
    - missing proof obligations
  - ledger_target: `docs/review-plan/runs/2026-04-27-agent-self-verification-scenario-matrix-optimality-loop.md`
- challenge_scope: `open`
- reviewer_set:
  - A1: structure purity
  - A2: compression and duplication
  - A3: consistency and second-authority search
  - A4: target function challenge
- kernel_council: `Ramanujan / Kolmogorov / Godel`
- dominance_axes: `concept-count / public-surface / compat-budget / migration-cost / proof-strength / future-headroom`
- stop_rule: accept only proposals that improve proof strength or future headroom without adding public surface, compatibility budget, or second authority.
- reopen_bar: reopen only if a candidate strictly dominates the adopted coverage-matrix contract on the dominance axes.
- ledger_path: `docs/review-plan/runs/2026-04-27-agent-self-verification-scenario-matrix-optimality-loop.md`
- writable: true

## assumptions

| id | summary | status | resolution_basis |
| --- | --- | --- | --- |
| `ASM-01` | A single SSoT page can hold coverage goals and exact report shape. | overturned | Reviewers found second report schema authority risk. Exact report shape remains with `09/core`; `16` now holds report pressure only. |
| `ASM-02` | CLI input gate can appear as a normal detection stage. | overturned | `16` now treats `cli transport gate` as pre-control-plane input failure and forbids it from becoming `nextRecommendedStage`. |
| `ASM-03` | Scenario can appear in the main loop without causing implemented-path confusion. | overturned | `16` now separates v1 daily loop, repair compare closure, and future escalation. |
| `ASM-04` | Program imports are enough to cover import failures. | overturned | `16` now includes source/package import, Program imports, runtime overlay, host binding, fixture/evidence, and compare failure domains. |
| `ASM-05` | Natural-language current status is enough. | overturned | `16` now uses `covered / partial / gap / future` and proof obligations. |

## rounds

### round 1: challenge

#### findings

| id | severity | class | summary | evidence | status |
| --- | --- | --- | --- | --- | --- |
| `F-01` | blocker | invalidity | `16` defined report fields/error codes while saying report contract belongs to `09`. | Original `AssemblyFailureEnvironment` and error code table. | closed |
| `F-02` | blocker | invalidity | `CLI entry gate` and `host deep trial` looked like second stage vocabulary. | Original stage table and matrix stage values. | closed |
| `F-03` | high | ambiguity | Scenario and compare appeared as one linear default chain. | Original north-star chain included future scenario before compare. | closed |
| `F-04` | high | ambiguity | Current status lacked proof obligations. | Matrix used natural-language `已支持/缺口/后置`. | closed |
| `F-05` | high | ambiguity | Import taxonomy was too narrow. | Original matrix focused on `Program.capabilities.imports`. | closed |
| `F-06` | medium | controversy | Kernel pressure list duplicated row-level TODOs. | Original row-level pressure plus separate backlog. | closed |

#### counter_proposals

| id | summary | why_better | overturns_assumptions | resolves_findings | supersedes_proposals | dominance | status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `ALT-1` | Convert `16` to a pure coverage pressure matrix. | Removes second stage/report authority and improves proofability. | `ASM-01`, `ASM-02`, `ASM-05` | `F-01`, `F-02`, `F-04` | baseline | dominates | adopted |
| `ALT-2` | Expand target from assembly-only to Agent repair-loop failure domains. | Covers source/package import, entry, host, evidence, compare domains without adding public surface. | `ASM-04` | `F-05` | baseline | partial | merged |
| `ALT-3` | Split stable coverage, current gaps, and kernel backlog within one page. | Keeps one SSoT page while avoiding stale status and duplicate TODOs. | `ASM-03`, `ASM-05` | `F-03`, `F-04`, `F-06` | baseline | partial | merged |

#### resolution_delta

- Rewrote `16` as `failure-domain x executable layer x status x report pressure x proof obligation`.
- Removed `AssemblyFailureEnvironment` and exact error code table from `16`.
- Added `Status Vocabulary`.
- Added `Closure Proof Obligations`.
- Added `Kernel Pressure Backlog` keyed by pressure id and matrix rows.
- Added `Agent Reading Rule` to route commands/report/capabilities/evidence back to owner pages.

## adoption

- adopted_candidate: `A2-adopted-candidate`
- lineage:
  - A1 ALT-1: pure coverage pressure matrix
  - A2 ALT-A2-1/A2-2: normalized coverage table with proof refs
  - A3 A2: keep `16` as matrix, keep exact schema with `09/core`
  - A4 ALT-1 + ALT-2: failure-domain matrix plus broader Agent repair-loop taxonomy
- rejected_alternatives:
  - baseline: kept too much stage/report authority inside `16`
  - move all report pressure to `09`: lost local kernel pressure usefulness
  - split into a new spec immediately: premature before stable SSoT closure
- rejection_reason: rejected alternatives either kept second-authority risk or reduced proof-strength/future-headroom.
- dominance_verdict: adopted candidate improves proof-strength and future-headroom while keeping public-surface, compat-budget, and migration-cost flat.
- freeze_record:
  - adopted_summary: `16` is now a terminal pressure matrix and pressure ledger for Agent self-verification failure domains. Exact stage, report schema, CLI transport, and DVTools evidence authority remain with their owner pages.
  - kernel_verdict:
    - Ramanujan: reduced stage/report concepts by moving authority back to owners.
    - Kolmogorov: compressed status and backlog into normalized tables.
    - Godel: removed second report schema and pseudo-stage authority.
  - frozen_decisions:
    - `16` may use `cli transport gate` only as pre-control-plane input failure, not as canonical stage or `nextRecommendedStage`.
    - `16` may name report pressure, but exact schema must be promoted to `09/core` before implementation.
    - scenario remains future and cannot be described as current CLI success path.
    - current coverage uses `covered / partial / gap / future`.
    - every covered or partial row needs proof obligation.
  - non_goals:
    - no new public authoring API
    - no Module entry fallback
    - no CLI-owned report truth
    - no DVTools-owned evidence truth
    - no default scenario/browser/raw trace gate
  - allowed_reopen_surface:
    - a smaller taxonomy that preserves proof obligations
    - a stronger owner split that removes more authority duplication
    - a real implementation finding proving one status is wrong
  - proof_obligations:
    - row-level proof command or contract test before marking `covered`
    - no public surface expansion
    - no second report/evidence truth
    - artifact links only through `artifacts[].outputKey`
    - `nextRecommendedStage` remains top-level authority
  - delta_from_previous_round: replaced original scenario matrix with a normalized failure-domain coverage matrix.

## post-closure terminal pressure refinement

用户进一步要求“尽可能逼近终局，才能压出当前 CLI 的实现缺口，甚至内核的实现缺口”。这不重开 owner split，也不改变上一轮关于 `16` 不持有 stage/report/schema authority 的裁决；本次只把已冻结的 failure-domain coverage matrix 推进为 terminal pressure matrix。

### additional assumptions

| id | summary | status | resolution_basis |
| --- | --- | --- | --- |
| `ASM-06` | 当前能失败即可证明该 row 接近终局。 | overturned | 终局 Agent 闭环需要稳定坐标、provider source、exact rerun input、artifact linking 与 compare closure；自由文本或 import-time throw 只能算 `partial/gap`。 |
| `ASM-07` | CLI 缺口和 core/kernel 缺口可以混在同一 report pressure 里。 | overturned | 用户要用矩阵压出当前 CLI 与内核实现缺口；`16` 现在显式拆 `current CLI gap` 与 `current core/kernel gap`。 |
| `ASM-08` | 装配漏加矩阵已经覆盖主要 Agent 自验证问题。 | refined | 终局压力还必须覆盖 source/typecheck、entry blueprint、config shape、exact rerun、stdout budget、artifact outputKey、compare digest admissibility。 |
| `ASM-09` | failure-domain catalog 足以逼出内核需求。 | overturned | A4 指出还缺 loop-level closure、PASS semantics、repeatability、DVTools roundtrip；v4 改为 invariant-first matrix。 |
| `ASM-10` | 16 可以长期维护 backlog adoption bar。 | overturned | A3/A2 指出会形成第二 backlog authority；v4 只保留 derived pressure index，owner adoption 回到 `09/15/04/14`。 |
| `ASM-11` | source/typecheck 可以直接压给 `Runtime.check`。 | overturned | A1/A3 指出会让 core 变成 compiler authority；v4 改为 source artifact producer 与 declaration gate 分层。 |

### terminal refinement delta

- `16` title updated from coverage matrix to terminal pressure matrix.
- Main table rewritten as `failure domain -> terminal expectation -> executable layer -> current executable coverage -> current CLI gap -> current core/kernel gap -> proof to promote`.
- Added explicit rows for:
  - Program entry fake brand / missing blueprint.
  - source/package import and typecheck.
  - config shape/type mismatch.
  - canonical evidence package input.
  - compare input validity.
  - artifact outputKey linking.
  - runId and exact rerun coordinate.
  - stdout determinism and budget.
- Reclassified `FD-IMPORT-02` as `gap` because current public type and normalizer still allow Layer inputs under `Program.capabilities.imports`.
- Reclassified `FD-IMPORT-03` as `partial` because duplicate import detection exists, but currently happens at Program.make/import-time rather than as `Runtime.check` report pressure.
- Split backlog into:
  - `Current Gap Summary`
  - `Kernel Pressure Backlog`
  - `CLI Pressure Backlog`
- Bound docs updated to call `16` a terminal pressure matrix rather than a scenario/coverage matrix.

### preserved freeze decisions

- `16` still does not define new stage vocabulary.
- `16` still does not define exact report schema, error code registry, environment shape, or `focusRef` key set.
- `cli transport gate` remains pre-control-plane input failure only.
- scenario and host deep trial remain future layers.
- CLI remains route/transport owner and cannot define dependency/import truth.
- DVTools selection manifest remains hint-only and cannot define evidence truth.

### new residual risk

- The matrix is now stricter than current implementation; many rows intentionally remain `partial` or `gap`.
- `Runtime.check` is the largest core pressure point because current implementation is still manifest-oriented.
- Exact rerun coordinate is now an explicit CLI gap because current `inputCoordinate` omits config and trial knobs.
- `Program.capabilities.imports` docs already say Program-only, but implementation still allows Layer inputs; this is now a concrete implementation gap rather than a docs-only note.

## round 3: terminal pressure challenge

### findings

| id | severity | class | summary | evidence | status |
| --- | --- | --- | --- | --- | --- |
| `F-07` | blocker | invalidity | `covered` rows lacked auditable `proof_ref`, making coverage self-certified by prose. | A1/A2/A3 all flagged v3 covered rows without test path. | closed |
| `F-08` | blocker | invalidity | `cli transport gate` appeared in the same executable layer column as runtime stages. | A1/A2/A3 found pseudo-stage risk. | closed |
| `F-09` | high | ambiguity | v3 duplicated backlog authority across current gap summary, kernel backlog and CLI backlog. | A2/A3 found multiple backlog namespaces and adoption bars inside `16`. | closed |
| `F-10` | high | ambiguity | source/package/typecheck pressure was written as if core owned compiler/source resolver authority. | A1/A3/A4 challenged `FD-SRC-01`. | closed |
| `F-11` | high | controversy | CLI overlay provider input wording could invite a new public DI input. | A1/A3 found provider overlay risk. | closed |
| `F-12` | blocker | ambiguity | Failure catalog lacked Agent loop-level success criteria. | A4 found no matrix-level repair closure target. | closed |
| `F-13` | high | ambiguity | PASS semantics and false PASS pressure were missing. | A4 found covered focused on structured failure, not stopping correctness. | closed |
| `F-14` | medium | ambiguity | DVTools evidence proof stopped at manifest parsing, not selected finding -> Agent repair roundtrip. | A4 found `FD-EVIDENCE` too transport-local. | closed |
| `F-15` | medium | ambiguity | exact rerun coordinate did not imply repeatability. | A4 found nondeterminism pressure missing. | closed |

### counter_proposals

| id | summary | why_better | overturns_assumptions | resolves_findings | supersedes_proposals | dominance | status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `ALT-4` | Rewrite `16` as invariant-first matrix. | Compresses failure catalog into terminal invariants, pressure rows, proof axes and proof refs. | `ASM-09` | `F-07`, `F-12`, `F-13`, `F-15` | v3 terminal pressure table | dominates | adopted |
| `ALT-5` | Split `control_plane_stage` from `pre_control_plane_gate`. | Removes pseudo-stage risk while still preserving transport pressure. | `ASM-02` | `F-08` | executable_layer column | dominates | adopted |
| `ALT-6` | Replace multiple backlogs with derived pressure index. | Keeps routing value while returning adoption bars to owner pages. | `ASM-10` | `F-09` | current/core/CLI/KP/CP backlog split | dominates | adopted |
| `ALT-7` | Add source artifact producer -> declaration gate boundary. | Forces typecheck/source proof without making core compiler authority. | `ASM-11` | `F-10` | broad `FD-SRC-01` | dominates | adopted |
| `ALT-8` | Add loop closure, PASS semantics, DVTools roundtrip and repeatability pressures. | Optimizes actual Agent daily coding outcome, not row-local failure coverage. | `ASM-09` | `F-12`, `F-13`, `F-14`, `F-15` | row-only promotion | dominates | adopted |

### resolution_delta

- Rewrote `16` v4 as `Terminal Invariants -> Route Vocabulary -> Proof Axes -> Terminal Pressure Matrix -> Derived Pressure Index`.
- Removed `Current Gap Summary`, `Kernel Pressure Backlog`, and `CLI Pressure Backlog`.
- Added mandatory `proof_ref` and downgraded all rows without full proof closure to `partial/gap/future`.
- Split route vocabulary into `control_plane_stage` and `pre_control_plane_gate`.
- Added loop-level closure target requiring before report, repair target, exact rerun, after report, compare closure and unique `nextRecommendedStage`.
- Added pressure for PASS semantics, source/declaration freshness, DVTools roundtrip and repeatability.
- Moved owner adoption pressure into `09`, `15`, `04` and `14` so `16` remains a pressure index instead of backlog authority.
- Rejected CLI raw provider overlay input in the CLI owner page and kept provider source classification with core/host owners.

## round 3 adoption

- adopted_candidate: `ALT-4 + ALT-5 + ALT-6 + ALT-7 + ALT-8`
- lineage:
  - A1: proof ref, route split, source/config/provider boundary, next stage pressure
  - A2: compression, single derived pressure index, proof axes, owner-only details
  - A3: no second backlog authority, no compiler authority in core, no CLI provider overlay
  - A4: loop closure, PASS semantics, source/declaration freshness, DVTools roundtrip, repeatability
- rejected_alternatives:
  - keep v3 failure-domain table with additional rows
  - keep separate kernel/CLI backlog tables inside `16`
  - let `Runtime.check` own TypeScript/package resolver details directly
  - expose CLI provider overlay input for trial
- rejection_reason: rejected alternatives either kept second-authority risk, increased maintenance surface, or weakened owner boundaries.
- dominance_verdict: adopted candidate strictly improves proof-strength and future-headroom while reducing concept duplication and keeping public surface flat.
- freeze_record:
  - adopted_summary: `16` is now an invariant-first terminal pressure matrix. It holds terminal invariants, route split, proof axes, pressure rows and derived gap routing; owner adoption pressure lives in `09/15/04/14`.
  - kernel_verdict:
    - Ramanujan: fewer durable objects than v3 by replacing failure catalog plus multiple backlogs with invariant-first matrix.
    - Kolmogorov: reduced duplicate backlog namespaces and moved exact contract details back to owners.
    - Godel: removed pseudo-stage and second backlog authority risks.
  - frozen_decisions:
    - `control_plane_stage` and `pre_control_plane_gate` are separate columns.
    - `covered` requires `proof_ref`.
    - `Derived Pressure Index` cannot define adoption bar, exact schema or public contract.
    - source/typecheck proof must flow through a derived source artifact boundary; `runtime.check` consumes declaration coordinate and digest pressure.
    - CLI v1 does not add raw provider overlay public input.
    - loop closure, PASS semantics, repeatability and DVTools roundtrip are first-class pressure.
  - non_goals:
    - no new public authoring API
    - no Module entry fallback
    - no CLI-owned report truth
    - no DVTools-owned evidence truth
    - no source compiler authority inside core
    - no default scenario/browser/raw trace gate
  - allowed_reopen_surface:
    - smaller invariant set preserving proof axes
    - stronger owner split that removes more duplication
    - implementation finding proving a status or proof_ref is wrong
    - real Agent loop showing missing pressure class
  - proof_obligations:
    - every `covered` row has runnable `proof_ref`
    - every promoted cluster has loop closure proof when applicable
    - no second report/evidence/stage/backlog authority
    - artifact links only through `artifacts[].outputKey`
    - `nextRecommendedStage` remains top-level authority
  - delta_from_previous_round: replaced v3 terminal failure-domain catalog with invariant-first terminal pressure matrix.

## round 4: converge

### findings

| id | severity | class | summary | evidence | status |
| --- | --- | --- | --- | --- | --- |
| `CV-01` | none | ambiguity | No unresolved findings after v4 invariant-first rewrite. | 3 converge reviewers passed. | closed |
| `CV-02` | residual-risk | ambiguity | `09` still said `runtime.check` handles type checking directly, which could revive compiler-authority ambiguity. | Converge reviewer residual risk. | closed |

### resolution_delta

- Added `09` clarification that type checking enters `runtime.check` only through derived source artifact.
- Clarified `runtime.check` does not own TypeScript compiler, package resolver or raw source truth.

## consensus

- status: closed
- unresolved_findings: []
- converge_round:
  - result: `3 reviewers passed after v4 invariant-first rewrite; 1 residual clarification in 09 applied locally`
  - local_patch:
    - Clarified source/typecheck boundary in `09`: derived source artifact is input pressure; core does not own compiler/source resolver truth.
  - final_basis: final converge confirmed no unresolved findings after the local patch; invariant-first target function, owner split, proof axes and adopted candidate stayed frozen.
- residual_risk:
  - Document consensus does not mean implementation coverage. `TP-LOOP-01`, `TP-SOURCE-01`, `TP-STATIC-01` remain `gap`.
  - Several rows remain `partial`; future promotion requires runnable proof packs, not single-point failure tests.
  - Later specs must preserve the current owner split so CLI schema artifact, DVTools selection and `CommandResult` do not become independent authority.
