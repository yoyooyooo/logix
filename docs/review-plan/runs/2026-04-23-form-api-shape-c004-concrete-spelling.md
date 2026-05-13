# Form API Shape C004 Concrete Spelling Review

## Meta

- target: `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/155-form-api-shape/challenge-c004-concrete-spelling.md`
- source_kind: `file-spec`
- reviewers: `A1/A2/A3/F`
- round_count: `1`
- challenge_scope: `frozen`
- consensus_status: `consensus reached`

## Bootstrap

- target_complete: `true`
- challenge_scope: `frozen`
- reviewer_set: `A1/A2/A3/F`
- active_advisors: `Feynman`
- activation_reason: `本轮聚焦 concrete spelling，与 Agent-first 教学性、首读可理解性直接相关`
- max_reviewer_count: `4`
- kernel_council: `Ramanujan / Kolmogorov / Godel`
- dominance_axes: `concept-count / public-surface / compat-budget / migration-cost / proof-strength / future-headroom`
- stop_rule: `只有通过 Ramanujan / Kolmogorov / Godel gate，且在 frozen hard law 下形成 strict-dominance 的 spelling-level challenger，才允许替换当前 baseline`
- reopen_bar: `不得重开 AC3.3 / P10 / P11 / S1 / S2 / C003；只有 concrete spelling 自身形成 strict-dominance，才允许重开`
- ledger_path: `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/review-plan/runs/2026-04-23-form-api-shape-c004-concrete-spelling.md`
- writable: `true`

## Assumptions

- A1:
  - summary: `本轮只审 concrete spelling，不重开 owner split 与 hard law`
  - status: `kept`
  - resolution_basis: `四位 reviewer 一致接受 frozen-scope framing`
- A2:
  - summary: `更短的词面不自动等于更低的 Agent 成本`
  - status: `kept`
  - resolution_basis: `A1/A2/F 都指出歧义成本高于字符成本`
- A3:
  - summary: `只有形成完整 replacement contract 的 strict-dominance alternative，才足以推翻当前 spelling`
  - status: `kept`
  - resolution_basis: `A1/A3 都要求三线同时不恶化`
- A4:
  - summary: `当前 baseline sketch 仍是 admissible search space 里最薄的 authoring 表达`
  - status: `kept`
  - resolution_basis: `A1/A2/A3 交集`

## Round 1

### Phase

- challenge

### Input Residual

- residual: `companion / lower / baseline sketch` concrete spelling compare

### Findings

- F1 `high` `ambiguity`:
  - summary: `C004` 在 `discussion.md` 与相关摘要页里仍被写成 `lower` callback-only challenge，范围漂移
  - evidence: `A2/F` 交集
  - status: `adopted`
- F2 `high` `proof-gap`:
  - summary: `lower` 虽已被当作当前 baseline spelling 使用，但 against-set 证明不够显式，`proof-strength` 轴仍有缺口
  - evidence: `A1/F` 交集
  - status: `adopted`
- F3 `medium` `teaching-gap`:
  - summary: `companion / lower` 缺少一条固定可复述的 gloss，首读教学与 Agent-first 生成稳定性不够
  - evidence: `F` 主提，`A2` 支持
  - status: `adopted`
- F4 `low` `noise`:
  - summary: baseline sketch 中的局部 carrier 别名会稀释 `exact carrier deferred` 口径
  - evidence: `A1`
  - status: `adopted`

### Counter Proposals

- P1:
  - summary: `freeze C004 as no strictly better concrete spelling under fixed hard law`
  - why_better: 不重开骨架，同时把 spelling compare 从开放残念收成有 freeze record 的 no-better verdict
  - overturns_assumptions: `C004 still remains callback-only open challenge`
  - resolves_findings: `F1`
  - supersedes_proposals: `keep C004 as loose future slot`
  - dominance: `dominates`
  - axis_scores: `concept-count +1 / public-surface 0 / compat-budget +1 / migration-cost +1 / proof-strength +2 / future-headroom +1`
- P2:
  - summary: `retain companion / lower, but add explicit gloss and no-better compare`
  - why_better: 不换词，但补齐教学与证明链，压掉 `fact / derive / project / build / resolve` 这类常见 challenger
  - overturns_assumptions: `baseline usage already equals proof`
  - resolves_findings: `F2 F3`
  - supersedes_proposals: `freeze wording without compare note`
  - dominance: `dominates`
  - axis_scores: `concept-count 0 / public-surface 0 / compat-budget 0 / migration-cost +1 / proof-strength +3 / future-headroom +1`
- P3:
  - summary: `remove local carrier alias from baseline sketch`
  - why_better: 保持 exact carrier deferred 口径，减少无收益准 noun
  - overturns_assumptions: `example-local alias is harmless even in candidate summary`
  - resolves_findings: `F4`
  - supersedes_proposals: `keep CompanionLeaf-style alias in baseline sketch`
  - dominance: `dominates`
  - axis_scores: `concept-count +1 / public-surface 0 / compat-budget 0 / migration-cost +1 / proof-strength +1 / future-headroom 0`

### Resolution Delta

- `F1 F2 F3 F4 -> adopted`
- `P1 P2 P3 -> adopted lineage`

## Adoption

- adopted_candidate: `C004.1 no strictly better concrete spelling under fixed hard law`
- lineage: `P1 + P2 + P3`
- rejected_alternatives:
  - `fact({ deps, lower })`
  - `companion({ deps, derive|compute|project|build|resolve })`
  - `companion(deps, lower)` positional carrier
  - builder / emit / patch-oriented public spelling
- rejection_reason: `都未通过 strict-dominance gate；要么加重词义混层，要么把 read/evidence 语言倒灌回 authoring side，要么降低 Agent-first 生成稳定性`
- dominance_verdict: `当前最优动作不是换词，而是冻结 no-better verdict 并补齐 gloss / compare 证据`

### Freeze Record

- adopted_summary: `在不重开 AC3.3 / P10 / P11 / S1 / S2 / C003 的前提下，当前没有 strictly better concrete spelling。field(path).companion({ deps, lower }) 继续作为 implementation baseline sketch。`
- kernel_verdict: `通过 Ramanujan / Kolmogorov / Godel gate；没有新增 public surface，也没有为词面偏好重开第二系统`
- frozen_decisions:
  - `C004` 固定同时审 `companion` noun、`lower` callback 与 baseline sketch
  - 当前不存在 strict-dominance alternative
  - `companion` 继续保留为 current no-better noun
  - `lower` 继续保留为 current no-better callback spelling
  - baseline sketch 继续保留 object-return recipe，但不再引入额外 carrier alias
  - candidate / signoff 必须补固定 gloss：
    - `companion = field-owned local soft-fact lane`
    - `lower = sync pure derivation from value / deps / source? to clear | bundle`
- non_goals:
  - 重开 owner split
  - 把 spelling freeze 升成 hard law
  - 为了词面更顺口引入新 family / 新 carrier / 新 read lane
- allowed_reopen_surface:
  - 只有当某个 spelling-level challenger 能在 owner law / read law / diagnostics law 三线同时强于当前 baseline，且删掉一层公开翻译，才允许重开
- proof_obligations:
  - `discussion.md` 必须把 `C004` 改写成 concrete spelling freeze
  - `candidate-ac3.3.md` 必须补 `Why lower` / no-better compare，并清掉局部 carrier alias
  - `signoff-brief.md` 必须补 fixed gloss，并把 `companion({ lower })` 改写成 `C004` no-better verdict
- delta_from_previous_round: `从 loose callback challenge 收成 concrete spelling no-better freeze`

## Consensus

- reviewers: `A1/A2/A3/F`
- adopted_candidate: `C004.1 no strictly better concrete spelling under fixed hard law`
- final_status: `consensus reached`
- stop_rule_satisfied: `true`
- residual_risk:
  - `AC4.1 field-fact-lane` 仍保留为 parked lexical counterfactual
  - `lower` 的词面证明强度后续仍可继续补强
  - concrete spelling 仍属于 sugar 层，不进入 hard law
