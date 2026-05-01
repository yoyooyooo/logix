# Form API Shape C007 Form API To Kernel Descent Review Ledger

## Meta

- target: `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/155-form-api-shape/challenge-c007-form-api-kernel-descent.md`
- source_kind: `file-spec`
- reviewers: `A1/A2/A3/A4`
- round_count: `2`
- challenge_scope: `open`
- consensus_status: `consensus reached`

## Bootstrap

- target_complete: `true`
- challenge_scope: `open`
- reviewer_set: `A1/A2/A3/A4`
- active_advisors: `Feynman`
- activation_reason: `涉及 public/kernel boundary，对外可理解性与 second-system 风险是明确 blind spot`
- max_reviewer_count: `4`
- kernel_council: `Ramanujan / Kolmogorov / Godel`
- dominance_axes: `concept-count / public-surface / compat-budget / migration-cost / proof-strength / future-headroom`
- stop_rule: `只有形成严格更优的下沉计划，或明确 no strictly better candidate，才允许冻结`
- reopen_bar: `不得重开 Form raw field route、host law、已冻结 exact surface；除非 reviewer 先证明这些前提下目标不可成立`
- ledger_path: `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/review-plan/runs/2026-04-23-form-api-shape-c007-form-api-kernel-descent.md`
- writable: `true`

## Assumptions

- A1:
  - summary: `继续下沉到 kernel` 可以作为本轮顶层目标函数
  - status: `rejected`
  - resolution_basis: reviewers 一致认为当前只能审 `kernel enabler / lowering ownership`，不能把 `kernel descent` 当顶层 reopen 主题
- A2:
  - summary: A/B/C 与 D0-D3 能在 frozen 约束下形成有效候选集
  - status: `rejected`
  - resolution_basis: reviewers 一致认为它们重复了已冻结边界、deferred residual 与已拒绝 challenger
- A3:
  - summary: semantic owner / declaration contract 仍可作为 live descent option
  - status: `rejected`
  - resolution_basis: reviewers 一致认为这会直接越过 declaration authority 与 owner split

## Round 1

### Phase

- challenge

### Input Residual

- none

### Findings

- F1 `critical` `invalidity`:
  - summary: `D2 Partial Semantic Descent` 直接越过已冻结 owner split 与单一 declaration authority
  - evidence: `A1/A3/A4` 交集
  - status: `adopted`
- F2 `critical` `redundancy`:
  - summary: A/B/C 与 D0-D3 重复了已冻结 boundary、deferred residual 与已拒绝 challenger，形成平行 contract
  - evidence: `A1/A2/A3/A4` 交集
  - status: `adopted`
- F3 `high` `misfocus`:
  - summary: 当前题面把 `kernel descent` 当顶层目标函数，偏离 `155` 当前 active gap 与 allowed reopen surface
  - evidence: `A2/A4` 交集
  - status: `adopted`
- F4 `high` `ambiguity`:
  - summary: exact `field(path).source(...)` act`、FormDeclarationContract` 与 internal mechanism 没有明确拆开
  - evidence: `A1/A3` 交集
  - status: `adopted`

### Counter Proposals

- P1:
  - summary: `residual mechanism-only kernel enabler audit`
  - why_better: 把搜索空间收窄到 implementation/evidence 所需的 internal mechanism / lowering ownership 残余，不再重开 semantic owner
  - overturns_assumptions: `A1`, `A3`
  - resolves_findings: `F1 F3 F4`
  - supersedes_proposals: `D2 Partial Semantic Descent`, `Question 5 public noun/declaration contract`
  - dominance: `dominates`
  - axis_scores: `concept-count +3 / public-surface 0 / compat-budget +2 / migration-cost +2 / proof-strength +3 / future-headroom +1`
- P2:
  - summary: `already frozen / needed enabler / reopen-gated` 三栏审计面
  - why_better: 删除重复分类，只保留真正 open 的 residual mechanism
  - overturns_assumptions: `A2`
  - resolves_findings: `F2 F4`
  - supersedes_proposals: `A/B/C`, `D0-D3`
  - dominance: `dominates`
  - axis_scores: `concept-count +2 / public-surface 0 / compat-budget +1 / migration-cost +2 / proof-strength +2 / future-headroom +1`
- P3:
  - summary: `result must directly serve G1/G2/G3/G4`
  - why_better: 把审计结果绑定回当前 active gap，避免结构整洁但主线零推进
  - overturns_assumptions: `descent clarity alone is enough`
  - resolves_findings: `F3`
  - supersedes_proposals: `generic kernel descent proposal`
  - dominance: `dominates`
  - axis_scores: `concept-count +1 / public-surface 0 / compat-budget 0 / migration-cost +1 / proof-strength +2 / future-headroom +1`

### Resolution Delta

- `F1 F2 F3 F4 -> adopted`
- `P1 P2 P3 -> adopted lineage`

## Adoption

- adopted_candidate: `C007.1 residual mechanism-only kernel enabler audit`
- lineage: `P1 + P2 + P3`
- rejected_alternatives:
  - `D2 Partial Semantic Descent`
  - `A/B/C` 三分法
  - `D0-D3` 宽方向表
  - `public noun / declaration contract` 下沉
- rejection_reason: `它们都把已冻结 boundary 重新带回 live search space，或直接重开 second-system 风险`
- dominance_verdict: `当前最优动作不是搜索更深 kernel descent，而是把题面收窄到 residual mechanism-only audit`

### Freeze Record

- adopted_summary: `C007 继续存在，但只作为 kernel enabler / lowering ownership 审计。它不再是顶层 kernel descent 提案。`
- kernel_verdict: `通过 Ramanujan / Kolmogorov / Godel gate；压掉了重复 contract、ghost alternatives 与 semantic owner drift`
- frozen_decisions:
  - 题面不再把 `kernel descent` 当顶层目标函数
  - 只审 `already frozen / needed enabler / reopen-gated`
  - `FormDeclarationContract`、exact `source(...)` act`、public noun descent` 退出本轮 workset
  - 结果只允许 `R0 / R1`
  - 任何新增结论都必须直接服务 `G1 / G2 / G3 / G4`
- non_goals:
  - 重开 owner split
  - 重开 declaration authority
  - 讨论 public noun 是否下沉到 kernel
  - 重开 raw field route
- allowed_reopen_surface:
  - 只允许 implementation/evidence 所需的 internal mechanism / lowering ownership 残余进入审计
  - 若要讨论 semantic owner / declaration contract 下沉，必须先走独立 preflight 与 replacement contract
- proof_obligations:
  - C007 文本必须删除 D2 与宽方向表
  - C007 文本必须显式冻结 exact `source(...)` act 与 declaration authority
  - C007 文本必须把结果空间绑定到 `R0 / R1`
  - discussion 必须记录这条收窄后的 freeze
- delta_from_previous_round: `从 kernel descent candidates 收窄到 residual mechanism-only audit`

## Round 2

### Phase

- converge

### Input Residual

- unresolved findings against adopted freeze record

### Findings

- none

### Counter Proposals

- none

### Resolution Delta

- all residual findings `closed`

## Consensus

- reviewers: `A1/A2/A3/A4`
- adopted_candidate: `C007.1 residual mechanism-only kernel enabler audit`
- final_status: `consensus reached`
- stop_rule_satisfied: `true`
- residual_risk:
  - `needed enabler` 若再次被扩写成 semantic owner 或 declaration 下沉，会重新越界
  - 独立 `C007` 文档仍有轻微增量成本，后续只应继续产出 `R0 / R1` 审计结论
