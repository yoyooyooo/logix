# Form Public Composition Law Review Ledger

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
- consensus_status: `open`

## Bootstrap

- target_complete: `authority target=form public composition law only; bound evidence=packages/logix-form/src/internal/form/impl.ts, packages/logix-form/src/react/useForm.ts, packages/logix-form/src/index.ts, packages/logix-form/src/internal/dsl/logic.ts, packages/logix-form/test/Form/FormModule.withLogic.immutability.test.ts, packages/logix-form/test/Form/Form.RulesManifest.Contract.test.ts, packages/logix-form/test/Form/Form.CanonicalAuthoringPath.test.ts, packages/logix-core/src/Module.ts, docs/review-plan/runs/2026-04-16-form-composition-model-challenge.md`
- review_contract:
  - artifact_kind: `ssot-contract`
  - review_goal: `design-closure`
  - target_claim: `under zero-user and forward-only assumptions, Form should expose exactly one public composition law; candidates are sealed FormProgram / imports-driven composition, logic-public composition, or an explicit hybrid`
  - non_default_overrides: `builder-first is out of scope except where it leaks into composition law; challenge scope stays open across FormProgram naming, imports-driven composition, post-make logic augmentation, host acquisition aliasing, and runtime-spine alignment`
- review_object_manifest:
  - source_inputs:
    - `docs/ssot/form/00-north-star.md`
    - `docs/ssot/form/13-exact-surface-contract.md`
    - `docs/ssot/runtime/03-canonical-authoring.md`
    - `docs/ssot/runtime/05-logic-composition-and-override.md`
    - `docs/ssot/runtime/06-form-field-kernel-boundary.md`
    - `docs/ssot/runtime/10-react-host-projection-boundary.md`
    - `docs/review-plan/runs/2026-04-16-form-composition-model-challenge.md`
  - materialized_targets:
    - `docs/ssot/form/00-north-star.md`
    - `docs/ssot/form/13-exact-surface-contract.md`
    - `docs/ssot/runtime/03-canonical-authoring.md`
    - `docs/ssot/runtime/05-logic-composition-and-override.md`
    - `docs/ssot/runtime/06-form-field-kernel-boundary.md`
    - `docs/ssot/runtime/10-react-host-projection-boundary.md`
  - authority_target: `form-public-composition-law@2026-04-16`
  - bound_docs:
    - `packages/logix-form/src/internal/form/impl.ts`
    - `packages/logix-form/src/react/useForm.ts`
    - `packages/logix-form/src/index.ts`
    - `packages/logix-form/src/internal/dsl/logic.ts`
    - `packages/logix-form/test/Form/FormModule.withLogic.immutability.test.ts`
    - `packages/logix-form/test/Form/Form.RulesManifest.Contract.test.ts`
    - `packages/logix-form/test/Form/Form.CanonicalAuthoringPath.test.ts`
    - `packages/logix-core/src/Module.ts`
    - `docs/internal/form-api-quicklook.md`
  - derived_scope: `Form public composition law only`
  - allowed_classes:
    - `public composition unit`
    - `post-make logic augmentation`
    - `imports-driven composition`
    - `host acquisition aliasing`
    - `runtime-spine alignment`
    - `public/internal mismatch`
    - `naming vs law`
  - blocker_classes:
    - `second composition law`
    - `hidden hybrid model`
    - `logic-public leak`
    - `fake-closed composition contract`
    - `runtime-spine misalignment`
    - `agent-hostile composition ambiguity`
  - ledger_target: `docs/review-plan/runs/2026-04-16-form-public-composition-law-review.md`
- challenge_scope: `open`
- reviewer_set: `A1, A2, A3, A4`
- active_advisors: `A4`
- activation_reason: `目标涉及 public contract、composition law、runtime spine 对齐，必须允许直接挑战 sealed FormProgram 与 logic-public 的相对最优性`
- max_reviewer_count: `4`
- kernel_council: `Ramanujan, Kolmogorov, Godel`
- dominance_axes: `concept-count, public-surface, compat-budget, migration-cost, proof-strength, future-headroom`
- stop_rule:
  - `Ramanujan gate`: 至少压掉一个组合概念、一个第二 law、或一段隐藏组合解释
  - `Kolmogorov gate`: `concept-count / public-surface / compat-budget` 不能整体变差；若核心轴不变，必须在 `proof-strength` 或 `future-headroom` 上形成严格改进
  - `Godel gate`: 不得引入第二 public composition law、第二 host truth、第二 public contract，或未解释矛盾
- reopen_bar: `freeze 之后只有在 dominance axes 上被更小更强方案直接支配，且通过三重 gate 时才允许 reopen`
- ledger_path: `docs/review-plan/runs/2026-04-16-form-public-composition-law-review.md`
- writable: `true`

## Assumptions

- A1:
  - summary: `FormProgram` 应成为唯一公开组合单元
  - status: `kept`
  - resolution_basis: `A1/A2/A3/A4 都把 sealed FormProgram / imports-driven composition 视为当前最强候选。`
- A2:
  - summary: `form.logic / withLogic` 不应继续停留在 surviving public composition law
  - status: `kept`
  - resolution_basis: `A1/A2/A3 的交集都认为这组能力若继续留在 core contract，会形成第二公开组合律。`
- A3:
  - summary: imports-driven composition 比 logic-public 更接近终局 public law
  - status: `kept`
  - resolution_basis: `A1/A2/A3 都把 imports-driven composition 视为最接近 runtime spine 的单一 law。`
- A4:
  - summary: `FormProgram` 只是结果名，最关键的是 runtime-spine-aligned composition law 本身
  - status: `kept`
  - resolution_basis: `A4 要求先冻结 single law，再看命名；其结论与 sealed FormProgram / imports-driven 方案相容。`

## Round 1

### Phase

- `challenge`

### Input Residual

- none

### Findings

- F1 `critical` `invalidity`:
  - summary: `logic-public` 当前只能证明 closure 未完成，不能据此赢过单一 composition law
  - evidence: `A1 + A2 + A4`
  - status: `merged`
- F2 `critical` `controversy`:
  - summary: `form.logic / withLogic` 仍是 live 路径，若不显式降出 core contract，就会形成第二公开组合律
  - evidence: `A1 + A2 + A3`
  - status: `merged`
- F3 `high` `ambiguity`:
  - summary: `FormProgram` 当前兼具 law 与结果名，命名会反向污染裁决
  - evidence: `A2 + A4`
  - status: `merged`
- F4 `high` `invalidity`:
  - summary: 当前目标函数没有把 `authoring-determinism / evidence-determinism / host-separability` 提升为硬门，hybrid 方案容易借解释更完整回流
  - evidence: `A4`
  - status: `merged`
- F5 `medium` `ambiguity`:
  - summary: `useForm` 这类 host alias 对组合律零增益，应退出组合模型叙事
  - evidence: `A2`
  - status: `merged`

### Counter Proposals

- P1:
  - summary: `logic-public composition law`
  - why_better: `logic 复用更显式`
  - overturns_assumptions:
  - resolves_findings:
  - supersedes_proposals:
  - dominance: `none`
  - axis_scores:
    - concept-count: `worse`
    - public-surface: `worse`
    - compat-budget: `same`
    - migration-cost: `same`
    - proof-strength: `partial`
    - future-headroom: `partial`
  - status: `rejected`
- P2:
  - summary: `explicit hybrid: FormProgram + public .logic/.withLogic`
  - why_better: `现实与实现更贴近`
  - overturns_assumptions:
  - resolves_findings:
  - supersedes_proposals:
  - dominance: `none`
  - axis_scores:
    - concept-count: `worse`
    - public-surface: `worse`
    - compat-budget: `same`
    - migration-cost: `same`
    - proof-strength: `partial`
    - future-headroom: `partial`
  - status: `rejected`
- P3:
  - summary: `SYN-19 sealed FormProgram / imports-driven single law`
  - why_better: `只保留一个公开组合单元和一条公开组合律；logic-public 退为 falsification challenger`
  - overturns_assumptions:
  - resolves_findings: `F1, F2, F3, F4, F5`
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

### Resolution Delta

- `A1/A2/A3/A4` 当前全部转为 `kept`
- `P3` -> `adopted`
- `logic-public` 改判为 falsification-only challenger
- `form.logic / withLogic` 退出 core public composition law

## Adoption

- adopted_candidate: `SYN-19 sealed FormProgram / imports-driven single law`
- lineage: `ALT-A1-1 + ALT-A2-1 + ALT-A4-1 + ALT-A4-2`
- rejected_alternatives: `P1, P2`
- rejection_reason: `logic-public 与 hybrid 都会把 live evidence 误升为第二公开组合律，破坏单 law 收口`
- dominance_verdict: `SYN-19 在 concept-count, public-surface, proof-strength, future-headroom 上形成直接改进，并通过 Ramanujan / Kolmogorov / Godel 三重 gate`

### Freeze Record

- adopted_summary: `Form 当前最强 public composition law 是 sealed FormProgram / imports-driven single law。builder 不再作为 peer composition model；logic-public 只保留为 falsification-only challenger。`
- kernel_verdict: `通过。当前应优先最小化公开组合概念，并把 runtime-spine alignment 作为硬约束。`
- frozen_decisions:
  - `FormProgram` 当前作为唯一公开组合单元
  - 公开复用与组合默认围绕 returned `FormProgram` 展开
  - imports-driven composition 是默认组合律
  - `useModule(formProgram, options?)` 是 canonical host acquisition
  - `useForm(formProgram, options?)` 只允许作为 package-local thin alias
  - `form.logic / withLogic` 退出 core public composition law
  - `logic-public` 只保留为 falsification-only challenger
- non_goals:
  - 本轮不决定 `FormProgram` 是否为最终永久命名
  - 本轮不处理 declaration carrier 清理与 `from + logic` cutover
  - 本轮不开始实现删除 `.logic/.withLogic`
- allowed_reopen_surface:
  - `FormProgram` 最终命名与 type freeze
  - `.logic/.withLogic` 的实现保留层级
  - declaration carrier 专项裁决
- proof_obligations:
  - supporting docs 不得再把 `.logic/.withLogic` 写成 core public composition law
  - 任何 host alias 都必须继续保持 `useModule(formProgram, options?)` thin alias 语义
  - 任何 future challenger 都必须先证明不引入第二公开组合律
- delta_from_previous_round: `从 public composition law 的 open challenge，压到 sealed FormProgram / imports-driven single law`

## Consensus

- reviewers: `A1, A2, A3, A4`
- adopted_candidate: `SYN-19 sealed FormProgram / imports-driven single law`
- final_status: `closed`
- stop_rule_satisfied: `true`
- residual_risk:
  - 当前实现里 `.logic/.withLogic` 仍是 live path，若后续不做实现或文档 cutover，它还会继续制造“真实 law 与冻结 law 不一致”的噪声
  - `FormProgram` 作为结果名仍可能被更小命名替代，但这不改变当前 single-law 裁决
