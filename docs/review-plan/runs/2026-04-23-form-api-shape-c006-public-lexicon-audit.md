# Form API Shape C006 Public Lexicon Audit

## Meta

- target: `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/155-form-api-shape/challenge-c006-public-lexicon-audit.md`
- source_kind: `file-spec`
- reviewers: `A1/A2/A3/F`
- round_count: `2`
- challenge_scope: `frozen`
- consensus_status: `consensus reached`

## Bootstrap

- target_complete: `true`
- challenge_scope: `frozen`
- reviewer_set: `A1/A2/A3/F`
- active_advisors: `Feynman`
- activation_reason: `本轮聚焦 public lexicon 的首读可理解性、系统一致性与 Agent-first 默认生成质量`
- max_reviewer_count: `4`
- kernel_council: `Ramanujan / Kolmogorov / Godel`
- dominance_axes: `concept-count / public-surface / compat-budget / migration-cost / proof-strength / future-headroom`
- stop_rule: `只有某套 lexicon 在 frozen hard law 下形成 strict-dominance，才允许替换当前 public lexicon`
- reopen_bar: `不得重开 AC3.3 / P10 / P11 / C004 / C004-R1；只有 public lexicon 自身形成 strict-dominance，才允许重开`
- ledger_path: `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/review-plan/runs/2026-04-23-form-api-shape-c006-public-lexicon-audit.md`
- writable: `true`

## Assumptions

- A1:
  - summary: `本轮只审 public lexicon，不重开结构、owner split、carrier law`
  - status: `kept`
  - resolution_basis: `四位 reviewer 全部接受 frozen-scope framing`
- A2:
  - summary: `若要批评某个词，必须给出整套更好的命名系统`
  - status: `kept`
  - resolution_basis: `challenge brief 已固定这条规则`
- A3:
  - summary: `teaching gloss 层会直接影响 Agent-first 生成，不可忽略`
  - status: `kept`
  - resolution_basis: `A1/A2/A3/F 交集`
- A4:
  - summary: `availability / candidates` 更接近 keep set，而不是 scar set`
  - status: `kept`
  - resolution_basis: `A2/A3/F 交集`

## Round 1

### Phase

- challenge

### Input Residual

- residual: public lexicon 全量审视

### Findings

- F1 `high` `proof-gap`:
  - summary: `strict-dominance` 的判定门未闭合，challenge brief 与 `P6` 缺失 `compat-budget / migration-cost`
  - evidence: `A1`
  - status: `adopted`
- F2 `high` `ambiguity`:
  - summary: `companion` 在不同文档里被讲成 `lane / primitive / boundary / skeleton`，词义串线
  - evidence: `A1/A2` 交集
  - status: `adopted`
- F3 `high` `ambiguity`:
  - summary: `lower` 在同一套文档里兼任 callback、normalize、row-scope lowering 等多义项
  - evidence: `A1/A2` 交集
  - status: `adopted`
- F4 `medium` `misfocus`:
  - summary: `availability / candidates` 被错误放进重点审视区，它们更接近 keep set
  - evidence: `A2/F` 交集
  - status: `adopted`
- F5 `medium` `teaching-gap`:
  - summary: 真正偏硬的不是 exact noun 本身，而是 gloss 层的高阶行话
  - evidence: `A1/A2/A3/F` 交集
  - status: `adopted`

### Counter Proposals

- P1:
  - summary: `unify C006 and P6 to six-axis strict-dominance gate`
  - why_better: 让 `no-better` 结论有完整证明门
  - overturns_assumptions: `proof-strength alone is enough`
  - resolves_findings: `F1`
  - supersedes_proposals: `keep reduced axis set`
  - dominance: `dominates`
  - axis_scores: `concept-count 0 / public-surface 0 / compat-budget +2 / migration-cost +2 / proof-strength +3 / future-headroom +1`
- P2:
  - summary: `typed explanation lexicon while keeping exact noun`
  - why_better: 不动 exact API，先把解释层压成单一角色字典
  - overturns_assumptions: `public noun and teaching gloss can drift independently`
  - resolves_findings: `F2 F3 F5`
  - supersedes_proposals: `rename public API now`
  - dominance: `dominates`
  - axis_scores: `concept-count +2 / public-surface 0 / compat-budget +2 / migration-cost +2 / proof-strength +3 / future-headroom +2`
- P3:
  - summary: `reclassify availability/candidates into keep set`
  - why_better: 把审视焦点收回真正的 scar set
  - overturns_assumptions: `availability/candidates still need high-pressure review`
  - resolves_findings: `F4`
  - supersedes_proposals: `keep availability/candidates in hot search space`
  - dominance: `dominates`
  - axis_scores: `concept-count +1 / public-surface 0 / compat-budget +1 / migration-cost +1 / proof-strength +1 / future-headroom +1`

### Resolution Delta

- `F1 F2 F3 F4 F5 -> adopted`
- `P1 P2 P3 -> adopted lineage`

## Round 2

### Phase

- converge

### Input Residual

- unresolved findings from `F1 / F2 / F3`

### Findings

- none

### Counter Proposals

- none

### Resolution Delta

- `F1` closed after six-axis gate aligned in `spec.md` and `challenge-c006-public-lexicon-audit.md`
- `F2` closed after `companion` explanation layer收回单一角色
- `F3` closed after non-public `lower` uses 改写为 `normalize / resolve`

## Adoption

- adopted_candidate: `C006.1 no strictly better public lexicon yet`
- lineage: `P1 + P2 + P3`
- rejected_alternatives:
  - immediate rename of `companion / lower / availability / candidates`
  - rename of `fieldValue` toward selector family
  - broader public helper family rename wave
- rejection_reason: `都未通过 strict-dominance gate；要么只局部顺眼，要么会引入新的 route / family / 第二习惯用法`
- dominance_verdict: `当前最优动作是保留 exact noun，收紧 explanation lexicon 与审查门`

### Freeze Record

- adopted_summary: `当前 public lexicon 暂无 strictly better 替代组。exact noun 保持不动；keep set 与 scar set 分离；teaching gloss 统一收白。`
- kernel_verdict: `通过 Ramanujan / Kolmogorov / Godel gate；没有为了词面焦虑重开结构`
- frozen_decisions:
  - `availability / candidates` 进入 keep set
  - scar set 收紧到 `companion / lower / rawFormMeta / teaching gloss`
  - `companion` 在解释层只按 lane 解释
  - `lower` 只保留 public callback 义项
  - `fieldValue / rawFormMeta / Form.Error.field` 统一按 selector helper / selector primitive 解释
  - `Form.Error` 统一按 namespace 解释
- non_goals:
  - 现在重命名 public API noun
  - 现在重开 owner split / carrier law
  - 为了更口语化引入新的 helper family
- allowed_reopen_surface:
  - 只有出现一套 strict-dominance 的 public lexicon set
  - 只有出现 exact noun 继续造成明显第二习惯用法或 Agent 误生成
- proof_obligations:
  - `spec.md` 与 `challenge-c006-public-lexicon-audit.md` 必须统一 six-axis gate
  - 解释层文案必须清掉 `companion primitive / companion boundary / lower-as-nonpublic-act`
  - signoff 必须改白 teaching gloss
- delta_from_previous_round: `从 open lexicon audit 收成 no-better public lexicon freeze`

## Consensus

- reviewers: `A1/A2/A3/F`
- adopted_candidate: `C006.1 no strictly better public lexicon yet`
- final_status: `consensus reached`
- stop_rule_satisfied: `true`
- residual_risk:
  - `companion / lower / rawFormMeta` 仍有陌生感 scar
  - teaching gloss 若后续再次技术化，仍可能反向污染 public lexicon 感知
