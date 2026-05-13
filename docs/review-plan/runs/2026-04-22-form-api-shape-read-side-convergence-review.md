# Form API Shape Read-Side Convergence Review

## Meta

- target: `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/runtime/10-react-host-projection-boundary.md`
- source_kind: `file-spec`
- reviewers: `A1/A2/A3/A4`
- round_count: `2`
- challenge_scope: `open`
- consensus_status: `consensus reached`

## Bootstrap

- target_complete: `true`
- challenge_scope: `open`
- reviewer_set: `A1/A2/A3/A4`
- kernel_council: `Ramanujan / Kolmogorov / Godel`
- dominance_axes: `concept-count / public-surface / compat-budget / migration-cost / proof-strength / future-headroom`
- stop_rule: `只有通过 Ramanujan / Kolmogorov / Godel gate 且在 dominance axes 上形成严格改进的 proposal 才允许 reopen`
- reopen_bar: `必须证明新的读侧组织不会引入第二 read family / 第二 diagnostics truth / 第二 host truth`
- ledger_path: `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/review-plan/runs/2026-04-22-form-api-shape-read-side-convergence-review.md`
- writable: `true`

## Assumptions

- A1:
  - summary: `本轮只审 read-side convergence，不重开顶层 owner split 或 carrier principle`
  - status: `kept`
  - resolution_basis: `用户已把这一簇明确为后续 API 品味优化的第一优先级`
- A2:
  - summary: `这轮先冻结 principle，再谈 helper retention/deletion 或 exact carrier`
  - status: `kept`
  - resolution_basis: `A1/A2/A3/A4 都把 principle freeze 排在更前面`
- A3:
  - summary: `row-heavy exact carrier 继续 deferred`
  - status: `kept`
  - resolution_basis: `四位 reviewer 都没有支持越过 S1-R4 的 no-better gate`

## Round 1

### Phase

- challenge

### Input Residual

- none

### Findings

- F1 `critical` `invalidity`:
  - summary: authority 文档当前仍然把 `fieldValue / rawFormMeta / Form.Error.field` 与 `useModule + useSelector` 摆成近似平权读主路，已经形成第二读侧心智
  - evidence: `A1/A2/A3/A4` 交集
  - status: `adopted`
- F2 `high` `ambiguity`:
  - summary: `fieldValue`、`rawFormMeta`、`Form.Error.field` 的结构角色不同，却被放进同一政策桶
  - evidence: `A1/A2/A3/A4` 交集
  - status: `adopted`
- F3 `high` `controversy`:
  - summary: 这轮最该冻结的是 read-side principle，不是 helper fate 或 row-heavy exact carrier
  - evidence: `A1/A2/A3/A4` 交集
  - status: `adopted`
- F4 `medium` `ambiguity`:
  - summary: `Form.Error.field` 目前的 companion wording 会和 `field(path).companion(...)` 抢词面
  - evidence: `A2/A3` 交集
  - status: `adopted`

### Counter Proposals

- P1:
  - summary: `single host gate + selector-support artifact taxonomy`
  - why_better: 把所有 surviving nouns 压回同一个 `useSelector` 消费门之下，消掉 route 级特例
  - overturns_assumptions: `selector-only + adjunct reinterpretation is enough`
  - resolves_findings: `F1 F2 F3`
  - supersedes_proposals: `parallel adjunct contract wording`
  - dominance: `dominates`
  - axis_scores: `concept-count +1 / public-surface 0 / compat-budget 0 / migration-cost +1 / proof-strength +3 / future-headroom +2`
- P2:
  - summary: `fieldValue/rawFormMeta/Form.Error.field` 重新分类`
  - why_better: 用对象分类代替 helper fate 争论，减少教学分叉
  - overturns_assumptions: `the three nouns can stay in one bucket`
  - resolves_findings: `F2 F4`
  - supersedes_proposals: `adjunct-three-pack`
  - dominance: `dominates`
  - axis_scores: `concept-count +1 / public-surface 0 / compat-budget 0 / migration-cost +1 / proof-strength +2 / future-headroom +1`
- P3:
  - summary: `row-heavy exact carrier stays deferred`
  - why_better: 保住 no-better verdict，避免过早长第二 read family
  - overturns_assumptions: `row-heavy carrier should be prioritized now`
  - resolves_findings: `F3`
  - supersedes_proposals: `touch exact carrier now`
  - dominance: `dominates`
  - axis_scores: `concept-count +1 / public-surface +1 / compat-budget +1 / migration-cost +1 / proof-strength +1 / future-headroom +2`

### Resolution Delta

- `F1 F2 F3 F4 -> adopted`
- `P1 P2 P3 -> adopted lineage`

## Adoption

- adopted_candidate: `single host gate + selector-support artifact taxonomy`
- lineage: `P1 + P2 + P3`
- rejected_alternatives: `keep adjuncts as parallel read contract`, `touch helper fate first`, `reopen row-heavy exact carrier now`
- rejection_reason: `都未通过 stop rule；要么继续维持第二读侧心智，要么提前重开 exact carrier`
- dominance_verdict: `当前最强动作是先冻结 principle，再让 authority docs 按对象分类归位`

### Freeze Record

- adopted_summary: `公开读侧只承认一条 canonical host gate：useModule + useSelector(handle, selector, equalityFn?)；任何 exported read noun 都只算 selector-support artifact。fieldValue 只算 core adjunct convenience，rawFormMeta 只算 core raw trunk adjunct，Form.Error.field 只算 form-owned selector primitive / explain-support primitive。row-heavy exact carrier 继续 deferred。`
- kernel_verdict: `通过 Ramanujan / Kolmogorov / Godel gate；没有新增 public surface，也没有引入第二 read family`
- frozen_decisions:
  - `useSelector` 是唯一公开读侧消费门
  - `fieldValue(path)` 继续可用，但退出主教学路线，也不得扩写成 companion read
  - `rawFormMeta()` 继续只服务 raw $form truth
  - `Form.Error.field(path)` 保留，但身份固定为 form-owned selector primitive / explain-support primitive
  - row-heavy owner binding 当前只能服务 selector 重入，不能获得独立 read 身份
  - row-heavy exact carrier 继续 deferred，`byRowId-first` 继续只算 reopen bias
- non_goals:
  - 现在删除 `fieldValue` 或 `rawFormMeta`
  - 现在重开 exact carrier noun/import shape
  - 现在给 `byRowId` 独立 read family 身份
- allowed_reopen_surface:
  - 只有当现有 single host gate 无法承接读取、解释或 row-heavy 重入，才允许重开 exact carrier / helper fate
- proof_obligations:
  - `spec.md` 必须承接 principle
  - `runtime/10` 必须把 read nouns 改成 selector-support artifact 口径
  - `form/13` 必须把 `Form.Error.field` 改成 selector primitive 口径
  - `signoff-brief.md` 必须补一屏 read-side snapshot
- delta_from_previous_round: `从 selector-only bias，收成 single host gate + selector-support artifact taxonomy`

## Round 2

### Phase

- converge

### Input Residual

- adopted freeze record `single host gate + selector-support artifact taxonomy`

### Findings

- none

### Counter Proposals

- none

### Resolution Delta

- all residual findings `closed`

## Consensus

- reviewers: `A1/A2/A3/A4`
- adopted_candidate: `single host gate + selector-support artifact taxonomy`
- final_status: `consensus reached`
- stop_rule_satisfied: `true`
- residual_risk: `principle 已收平；剩余风险只在 authority 文案是否还能继续压缩、helper fate 是否后续再收、以及 row-heavy exact carrier 是否在更强 witness 下重开。当前都不足以触发 reopen。`
