# Form API Shape Remaining Candidates Review

## Meta

- target: `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/155-form-api-shape/spec.md` with linked candidate artifacts
- source_kind: `file-spec`
- reviewers: `A1/A2/A3/A4`
- round_count: `2`
- challenge_scope: `open`
- consensus_status: `consensus reached`

## Bootstrap

- target_complete: `true`
- challenge_scope: `open`
- reviewer_set: `A1/A2/A3/A4`
- active_advisors: `none`
- activation_reason: `open scope + public contract + long-term API governance`
- max_reviewer_count: `4`
- kernel_council: `Ramanujan / Kolmogorov / Godel`
- dominance_axes: `concept-count / public-surface / compat-budget / migration-cost / proof-strength / future-headroom`
- stop_rule: `只有通过 Ramanujan / Kolmogorov / Godel gate 且在 dominance axes 上形成严格改进的 proposal 才允许 reopen`
- reopen_bar: `必须给出更小、更稳或 proof-strength 更强的严格证据，且不能引入第二 authority / 第二 workflow / 第二 diagnostics truth`
- ledger_path: `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/review-plan/runs/2026-04-22-form-api-shape-remaining-candidates-review.md`
- writable: `true`

## Assumptions

- A1:
  - summary: `本轮 workset 是 spec + discussion + candidate-ac3.3 + candidate-ac4-field-fact-lane + top-level-challenger-inbox + scenario-proof-family`
  - status: `kept`
  - resolution_basis: `用户要继续打磨 155 剩余强候选，并允许 plan-optimality-loop 多 reviewer 并行评审`
- A2:
  - summary: `challenge_scope=open，但只允许围绕顶层方向、law bundle 与 remaining strong candidates 展开`
  - status: `kept`
  - resolution_basis: `所有 reviewer 都按同一 bootstrap contract 审核，不进入实现层`
- A3:
  - summary: `AC3.3 仍是当前 active public candidate，AC4.1 是唯一 parked public challenger`
  - status: `merged`
  - resolution_basis: `reviewers 一致维持 AC3.3 领先，同时把 AC4.1 收口成更窄的 challenger`
- A4:
  - summary: `H007 可以升格为长期 review overlay，但不进入 public contract 搜索空间`
  - status: `kept`
  - resolution_basis: `A2/A4 都认为它更适合作为 admission / owner-law overlay，而不是新的 public noun`

## Round 1

### Phase

- challenge

### Input Residual

- previous plateau ledger: `2026-04-22-form-api-shape-optimality-loop.md`

### Findings

- F1 `critical` `invalidity`:
  - summary: 当前顶层目标函数停在 `less-system-split`，层级偏低，容易把 spelling 直观性误判成顶层改进
  - evidence: `A4` 明确指出仓库真正保护的是 declaration -> selector read -> diagnostics evidence 的单一可证据回链 lane；`A1/A3` 也都把 owner/read/diagnostics law 视为更高阶裁判面
  - status: `adopted`
- F2 `high` `ambiguity`:
  - summary: 稳定层过早绑定 `companion` wording，导致共享 proof 词汇与 reopen authority 漂移
  - evidence: `A2/A4` 交集；两者都指出 spec 里的 MUST 级 wording 提前给 `companion` 加锚点，放大 docs/ledger 迁移成本
  - status: `adopted`
- F3 `high` `controversy`:
  - summary: `AC4.1` 当前只删除词汇和相位叙事，未删除规则，继续把它当 preferred challenger 会制造 ghost alternative
  - evidence: `A1/A2/A3/A4` 交集；都认为它最多保留为 lexical challenger
  - status: `adopted`
- F4 `high` `ambiguity`:
  - summary: `allowed reopen surface` 分散在 spec、candidate、ledger 三处，authority 正在漂移
  - evidence: `A3` 直接点出三套枚举漂移；`A2` 也要求把共享 proof 层与 freeze wording 收回单一入口
  - status: `adopted`
- F5 `medium` `controversy`:
  - summary: `H007 owner matrix / capability lattice` 不适合升成 public candidate，但适合保留为 review overlay
  - evidence: `A2/A4` 交集；两者都认为它更像 review schema / admission overlay
  - status: `adopted`

### Counter Proposals

- P1:
  - summary: `law-first freeze + single evidence-backlinked local-soft-fact lane`
  - why_better: 把北极星从 `less-system-split` 上移到 owner/read/diagnostics/trial/compare 共用同一 truth 与同一 evidence envelope 的单一 lane
  - overturns_assumptions: `less-system-split is enough`
  - resolves_findings: `F1 F2`
  - supersedes_proposals: `none`
  - dominance: `dominates`
  - axis_scores: `concept-count +1 / public-surface 0 / compat-budget 0 / migration-cost +1 / proof-strength +3 / future-headroom +2`
- P2:
  - summary: `keep AC3.3 + demote AC4.1 to parked lexical challenger`
  - why_better: 保留当前最强 public contract，同时把 challenger 精确压到 spelling-level，避免 ghost alternative
  - overturns_assumptions: `AC4.1 is still a top-level challenger`
  - resolves_findings: `F3`
  - supersedes_proposals: `AC4.1 preferred-challenger path`
  - dominance: `dominates`
  - axis_scores: `concept-count +1 / public-surface 0 / compat-budget +1 / migration-cost +1 / proof-strength +2 / future-headroom +1`
- P3:
  - summary: `single reopen authority + H007 review overlay`
  - why_better: 统一 reopen surface 到 spec，把 H007 收为 admission overlay，减少 docs/ledger 漂移
  - overturns_assumptions: `spec/candidate/ledger can each hold reopen triggers`
  - resolves_findings: `F4 F5`
  - supersedes_proposals: `duplicated reopen enumerations`
  - dominance: `dominates`
  - axis_scores: `concept-count +2 / public-surface 0 / compat-budget +1 / migration-cost +2 / proof-strength +2 / future-headroom +2`

### Resolution Delta

- `F1 F2 F3 F4 F5 -> adopted`
- `P1 P2 P3 -> adopted lineage`
- `AC4.1 top-level preferred challenger -> overturned`
- `H007 public candidate seed -> overturned`

## Adoption

- adopted_candidate: `AC3.3 kept + law-first freeze + AC4.1 parked lexical challenger + H007 review overlay`
- lineage: `P1 + P2 + P3`
- rejected_alternatives: `promote AC4.1`, `keep less-system-split as top north star`, `elevate H007 to public candidate`
- rejection_reason: `都未通过 strict-dominance bar；要么只换词不删规则，要么更像 review schema 而不是 public contract`
- dominance_verdict: `current baseline remains AC3.3, but stable layer must be rewritten in law-first wording`

### Freeze Record

- adopted_summary: `保持 AC3.3 为 active public candidate；稳定层改写成 law-first 的 local-soft-fact lane 口径；AC4.1 只保留为 parked lexical challenger；H007 只保留为 review overlay`
- kernel_verdict: `通过 Ramanujan / Kolmogorov / Godel gate；没有新增 public surface，也没有引入第二 authority`
- frozen_decisions:
  - 北极星上移为 `single evidence-backlinked local-soft-fact lane`
  - `less-system-split` 只保留为 dominance proxy
  - `spec.md` 不再把 `companion` 当稳定层 spelling 前提
  - `AC4.1` 只保留 spelling-level 压力测试职责
  - `H007` 只保留 review overlay 职责
  - `Allowed Reopen Surface` 统一只在 `spec.md` 维护
- non_goals:
  - 现在冻结 `companion`、`fact` 或其他 spelling 的终局胜负
  - 把 `H007` 升成 public contract
  - 让 `AC4.1` 继续承担顶层目标函数挑战
- allowed_reopen_surface:
  - sanctioned read route 失败，selector-only 路线无法承接 local-soft-fact 读取且会暴露内部 path
  - 出现无法 field-local 化且无法路由到现有 owner split 的 `list/root` 级 soft slice
  - `availability / candidates` reduction 失败，或 per-slot deps/source divergence 已出现可测性能或诊断代价
  - spelling-level challenger 能在 `WF1 .. WF6` 上删除一层公开翻译，并在 owner law / read law / diagnostics law 三线强于 `AC3.3`
- proof_obligations:
  - 继续补齐 actual code / empirical evidence
  - 若未来要重开 `AC4.1`，必须证明它删掉了规则而不是只换词
  - 若未来要重开 owner scope，必须给出 irreducible `list/root` soft slice proof
- delta_from_previous_round: `从 companion-centered stable wording 收到 law-first stable wording；从 parked challenger 收到 parked lexical challenger；把 H007 提升为 review overlay`

## Round 2

### Phase

- converge

### Input Residual

- adopted freeze record `AC3.3 kept + law-first freeze + AC4.1 parked lexical challenger + H007 review overlay`

### Findings

- none

### Counter Proposals

- none

### Resolution Delta

- all residual findings `closed`

## Consensus

- reviewers: `A1/A2/A3/A4`
- adopted_candidate: `AC3.3 kept + law-first freeze + AC4.1 parked lexical challenger + H007 review overlay`
- final_status: `consensus reached`
- stop_rule_satisfied: `true`
- residual_risk: `剩余风险已全部回到实现证据层，集中在 sanctioned local-soft-fact read route、row-heavy proof bundle、diagnostics causal chain 的 actual code / empirical evidence 闭环；当前不足以触发 reopen。`
