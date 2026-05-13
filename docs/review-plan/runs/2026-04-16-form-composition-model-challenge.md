# Form Composition Model Challenge Ledger

## Meta

- target: `docs/ssot/form/13-exact-surface-contract.md`
- targets:
  - `docs/ssot/form/00-north-star.md`
  - `docs/ssot/form/13-exact-surface-contract.md`
  - `docs/ssot/runtime/03-canonical-authoring.md`
  - `docs/ssot/runtime/05-logic-composition-and-override.md`
  - `docs/ssot/runtime/06-form-field-kernel-boundary.md`
  - `docs/ssot/runtime/10-react-host-projection-boundary.md`
- source_kind: `file-ssot-contract`
- reviewers: `A1, A2, A3, A4`
- round_count: `1`
- challenge_scope: `open`
- consensus_status: `closed`

## Bootstrap

- target_complete: `authority target=form composition contract; bound evidence=packages/logix-form/src/internal/form/impl.ts, packages/logix-form/src/react/useForm.ts, packages/logix-form/test/Form/FormModule.withLogic.immutability.test.ts, packages/logix-form/test/Form/Form.RulesManifest.Contract.test.ts, docs/review-plan/runs/2026-04-16-form-public-api-optimality-loop.md`
- review_contract:
  - artifact_kind: `ssot-contract`
  - review_goal: `design-closure`
  - target_claim: `under zero-user and forward-only assumptions, Form should keep builder-first + program-first as its strongest public composition model only if that pair still strictly dominates logic-first, logic-public, or other smaller composition contracts`
  - non_default_overrides: `challenge scope stays open across target function, public composition unit, logic exposure, host acquisition mapping, and runtime-spine alignment; no compatibility preservation is required`
- review_object_manifest:
  - source_inputs:
    - `docs/ssot/form/00-north-star.md`
    - `docs/ssot/form/13-exact-surface-contract.md`
    - `docs/ssot/runtime/03-canonical-authoring.md`
    - `docs/ssot/runtime/05-logic-composition-and-override.md`
    - `docs/ssot/runtime/06-form-field-kernel-boundary.md`
    - `docs/ssot/runtime/10-react-host-projection-boundary.md`
    - `docs/review-plan/runs/2026-04-16-form-public-api-optimality-loop.md`
  - materialized_targets:
    - `docs/ssot/form/00-north-star.md`
    - `docs/ssot/form/13-exact-surface-contract.md`
    - `docs/ssot/runtime/03-canonical-authoring.md`
    - `docs/ssot/runtime/05-logic-composition-and-override.md`
    - `docs/ssot/runtime/06-form-field-kernel-boundary.md`
    - `docs/ssot/runtime/10-react-host-projection-boundary.md`
  - authority_target: `form-composition-model@2026-04-16`
  - bound_docs:
    - `packages/logix-form/src/internal/form/impl.ts`
    - `packages/logix-form/src/react/useForm.ts`
    - `packages/logix-form/test/Form/FormModule.withLogic.immutability.test.ts`
    - `packages/logix-form/test/Form/Form.RulesManifest.Contract.test.ts`
    - `docs/internal/form-api-quicklook.md`
    - `docs/review-plan/runs/2026-04-16-form-public-api-optimality-loop.md`
  - derived_scope: `Form public composition model only`
  - allowed_classes:
    - `composition unit`
    - `authoring carrier`
    - `logic exposure`
    - `program alignment`
    - `public/internal composition mismatch`
    - `host acquisition aliasing`
    - `imports and host composition`
    - `reuse / override model`
  - blocker_classes:
    - `second composition model`
    - `hidden expert-only composition path`
    - `logic residue leaking stronger public model`
    - `runtime-spine misalignment`
    - `agent-hostile composition ambiguity`
    - `fake-closed composition contract`
  - ledger_target: `docs/review-plan/runs/2026-04-16-form-composition-model-challenge.md`
- challenge_scope: `open`
- reviewer_set: `A1, A2, A3, A4`
- active_advisors: `A4`
- activation_reason: `目标涉及 public contract、composition model、长期治理与 target function，本轮必须允许直接挑战 builder-first + program-first 是否仍应成立`
- max_reviewer_count: `4`
- kernel_council: `Ramanujan, Kolmogorov, Godel`
- dominance_axes: `concept-count, public-surface, compat-budget, migration-cost, proof-strength, future-headroom`
- stop_rule:
  - `Ramanujan gate`: 至少压掉一个 composition concept、一个公开边界、或一段重复 contract
  - `Kolmogorov gate`: `concept-count / public-surface / compat-budget` 不能整体变差；若核心轴不变，必须在 `proof-strength` 或 `future-headroom` 上形成严格改进
  - `Godel gate`: 不得引入第二 composition law、第二 host truth、第二 public contract，或未解释矛盾
- reopen_bar: `freeze 之后只有在 dominance axes 上被更小更强方案直接支配，且通过三重 gate 时才允许 reopen`
- ledger_path: `docs/review-plan/runs/2026-04-16-form-composition-model-challenge.md`
- writable: `true`

## Assumptions

- A1:
  - summary: `builder-first + program-first` 组合当前已经是最小且最强的 Form public composition model
  - status: `overturned`
  - resolution_basis: `A1/A2/A3/A4 的交集都指出 pair 把 declaration carrier 与 composition unit 绑成同一 claim，证明目标未归一。`
- A2:
  - summary: Form 不需要把 `logic` 提升回公开一等组合单元
  - status: `challenged`
  - resolution_basis: `logic-public 不一定应该回到 day-one public family，但当前实现里的 form.logic / withLogic 确实仍是活的组合 challenger。`
- A3:
  - summary: 当前实现里的 `form.logic / withLogic / imports:[form]` 只是 residue 或 supporting evidence，不构成更强的公开组合 challenger
  - status: `overturned`
  - resolution_basis: `A1/A2/A3 共同确认这几条是 live composition evidence，不能再简单归类为 residue。`
- A4:
  - summary: `builder-first` 与 `program-first` 这两个目标函数天然同向，不需要拆开分别裁决
  - status: `overturned`
  - resolution_basis: `A4 直接证明二者对应不同层级，proof obligation 不同，必须拆开裁决。`

## Round 1

### Phase

- `challenge`

### Input Residual

- none

### Findings

- F1 `critical` `invalidity`:
  - summary: 当前 claim 把 declaration carrier 与 public composition unit 绑成同一个评审对象，目标未归一
  - evidence: `A1 + A2 + A4`
  - status: `merged`
- F2 `critical` `controversy`:
  - summary: 当前实现里的 `form.logic / withLogic / imports:[form]` 是活的组合路径，不能再当纯 residue 处理
  - evidence: `A1 + A2 + A3`
  - status: `merged`
- F3 `high` `invalidity`:
  - summary: `builder-first` 自身仍未完全闭环，`from + logic` 这条第二 declaration carrier 仍在实现和测试里存活
  - evidence: `A1 + A2 + A3`
  - status: `merged`
- F4 `high` `ambiguity`:
  - summary: `program-first` 当前混合了 package 定位、返回类型命名、运行时蓝图语义与 imports-driven composition，多义过载
  - evidence: `A2 + A3 + A4`
  - status: `merged`
- F5 `medium` `ambiguity`:
  - summary: `useForm` 这类 host alias 继续占用组合模型解释预算，但对组合律本身零增益
  - evidence: `A2`
  - status: `merged`

### Counter Proposals

- P1:
  - summary: `继续把 builder-first + program-first 当成一对联合组合模型审`
  - why_better: `范围看似完整`
  - overturns_assumptions:
  - resolves_findings:
  - supersedes_proposals:
  - dominance: `none`
  - axis_scores:
    - concept-count: `worse`
    - public-surface: `same`
    - compat-budget: `same`
    - migration-cost: `same`
    - proof-strength: `worse`
    - future-headroom: `worse`
  - status: `rejected`
- P2:
  - summary: `SYN-18 split-carrier-vs-composition-law`
  - why_better: `先把 declaration carrier 与 composition unit 分轴裁决，避免 builder-first 和 program-first 互相拖累`
  - overturns_assumptions: `A1, A3, A4`
  - resolves_findings: `F1, F2, F4, F5`
  - supersedes_proposals:
  - dominance: `dominates`
  - axis_scores:
    - concept-count: `better`
    - public-surface: `better`
    - compat-budget: `same`
    - migration-cost: `same`
    - proof-strength: `better`
    - future-headroom: `better`
  - status: `adopted`
- P3:
  - summary: `ALT-A1-1 sealed FormProgram as sole public composition unit`
  - why_better: `若后续 program-first survives，它应单独以 sealed FormProgram / imports-driven composition 与 logic-public 对比`
  - overturns_assumptions: `A1, A2, A3, A4`
  - resolves_findings: `F2, F4`
  - supersedes_proposals:
  - dominance: `partial`
  - axis_scores:
    - concept-count: `better`
    - public-surface: `better`
    - compat-budget: `same`
    - migration-cost: `same`
    - proof-strength: `better`
    - future-headroom: `better`
  - status: `deferred`

### Resolution Delta

- `A1` -> `overturned`
- `A2` -> `challenged`
- `A3` -> `overturned`
- `A4` -> `overturned`
- `P2` -> `adopted`
- `builder-first` 暂时降为 declaration carrier 候选，不再和 composition law 绑审
- `program-first` 改写为待独立审查的 `public composition law / output law`

## Adoption

- adopted_candidate: `SYN-18 split-carrier-vs-composition-law`
- lineage: `ALT-A4-1 + ALT-A2-1 + ALT-A1-1`
- rejected_alternatives: `P1`
- rejection_reason: `继续把 pair 绑审会让未归一的两层对象互相污染 proof obligation`
- dominance_verdict: `SYN-18 在 concept-count, proof-strength, future-headroom 上形成直接改进，并通过 Ramanujan / Kolmogorov / Godel 三重 gate`

### Freeze Record

- adopted_summary: `本轮不直接裁决 builder-first 或 program-first 哪个整体胜出；本轮先冻结一个更小的 review contract：builder-first 只作为 declaration carrier 候选，program-first 改写为待独立审查的 public composition law`
- kernel_verdict: `通过。当前最小正确动作是拆轴，而不是继续在错误 target 上比较赢家`
- frozen_decisions:
  - `builder-first` 与 `program-first` 不再作为一个联合命题审
  - `builder-first` 当前只保留为 declaration carrier 候选
  - `program-first` 当前改写为 `runtime-spine-aligned public composition law` 待审对象
  - `logic-public` 继续作为有效 challenger 保留
  - `form.logic / withLogic / imports:[form]` 当前视为 live composition evidence
- non_goals:
  - 本轮不决定 `logic-public` 是否应回到 day-one public family
  - 本轮不决定 `FormProgram` 是否最终胜出
  - 本轮不开始实现 cutover
- allowed_reopen_surface:
  - declaration carrier 专项裁决
  - public composition law 专项裁决
  - `form.logic / withLogic` 的最终地位
  - `from + logic` 是否彻底降为 closed residue
- proof_obligations:
  - 下一轮若审 declaration carrier，必须只比较 carrier，不再混入 composition unit
  - 下一轮若审 public composition law，必须直接比较 `sealed FormProgram / imports-driven`、`logic-public`、必要的 hybrid 候选
  - 任何方案都必须明确 `form.logic / withLogic` 是公开 law、supporting evidence，还是 closed residue
- delta_from_previous_round: `从 pair target 改写为双轴 target；当前先把错误的评审对象拆开`

## Consensus

- reviewers: `A1, A2, A3, A4`
- adopted_candidate: `SYN-18 split-carrier-vs-composition-law`
- final_status: `closed`
- stop_rule_satisfied: `true`
- residual_risk:
  - 当前只完成了“拆轴”这一步，没有完成 builder-first 或 program-first 的终局裁决
  - 若后续不单独处理 `form.logic / withLogic` 的地位，第二组合律还会继续存在
