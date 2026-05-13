# Form Convergence Direction Review Ledger

## Meta

- target: `docs/ssot/form/04-convergence-direction.md`
- source_kind: `file-plan`
- reviewer_count: `4`
- reviewer_model: `gpt-5.4`
- reviewer_reasoning: `xhigh`
- challenge_scope: `open`
- consensus_status: `closed`

## Bootstrap

- target_complete: `true`
- challenge_scope: `open`
- reviewer_set: `A1, A2, A3, A4`
- active_advisors: `A4`
- activation_reason: `目标涉及 form 北极星、owner split、长期治理优先级与 public contract 方向，需要目标函数挑战`
- max_reviewer_count: `4`
- kernel_council: `Ramanujan, Kolmogorov, Godel`
- dominance_axes: `concept-count, public-surface, compat-budget, migration-cost, proof-strength, future-headroom`
- stop_rule:
  - `Ramanujan gate`: 至少压掉一个 assumption、一个 public boundary、或一段重复 contract
  - `Kolmogorov gate`: `concept-count / public-surface / compat-budget` 不整体变差；若核心轴不变，必须在 `proof-strength` 或 `future-headroom` 上形成严格改进
  - `Godel gate`: 不得引入第二套 authority、第二套 workflow、第二套 contract、或未闭合矛盾
- reopen_bar: `只有当 adopted candidate 在 dominance axes 上被更优方案直接支配，且通过三重 gate，才允许 reopen`
- ledger_path: `docs/review-plan/runs/2026-04-15-form-convergence-direction-review.md`
- writable: `true`

## Assumptions

- A1:
  - summary: `Form 下一阶段的主矛盾在 form 语义闭环，而不在 host sugar 对等`
  - status: `kept`
  - resolution_basis: `四位 reviewer 均未挑战该主判断；最终 adopted candidate 继续把 host sugar 后置到主收敛波次之后`
- A2:
  - summary: `presence、完整 ListDelta、asyncRule、decoded submit、更强 $form、explainability 构成当前主缺口`
  - status: `overturned`
  - resolution_basis: `review loop 将其压缩为四个根语义 bundle；$form control plane、explainability、trial feed 改为派生 contract 与 wave gate`
- A3:
  - summary: `async validation 应继续复用 source 已有的 keyed task substrate，不应独立长出 form 专属 async engine`
  - status: `kept`
  - resolution_basis: `adopted candidate 继续冻结“复用同一条 keyed task substrate”，且 reviewer converge 后无 reopen`
- A4:
  - summary: `decoded submit payload 属于 Form 语义，而不应下沉到 field-kernel 或 host projection`
  - status: `kept`
  - resolution_basis: `adopted candidate 保留 Form ownership，并新增“不得进入第五状态面”的负约束`
- A5:
  - summary: `推进顺序应保持 先语义闭环 -> 再提交与异步规则 -> 再 explain/verification 对接`
  - status: `overturned`
  - resolution_basis: `review loop 改成每一波都自带最小 verification-feed gate，并把 $form freeze 后移到 Wave B`

## Round 1

### Phase

- `challenge`

### Input Residual

- none

### Findings

- F1 `critical` `invalidity`:
  - summary: `04` 同时重述缺口、owner、proof obligation，已经形成第二 authority
  - evidence: `04` 初稿与 `02/03/runtime/06` 并行定义同一组事实
  - status: `merged`
- F2 `high` `invalidity`:
  - summary: `kernel substrate 抽象与收敛` 被写成独立第二优先级，internal lowering 被误抬成独立 roadmap object
  - evidence: `04` 初稿把 kernel 列成固定第二优先级，与 `03/runtime/06` 的 owner split 冲突
  - status: `merged`
- F3 `high` `ambiguity`:
  - summary: `$form` freeze 早于 `async validation lane + submit gate`，control plane contract 被拆成半定义阶段
  - evidence: 初稿 Wave A 放 `$form`，Wave B 才放 async 与 submit gate reasons
  - status: `merged`
- F4 `high` `invalidity`:
  - summary: explain / verification 被后置到 Wave C，和 AI Native 目标冲突
  - evidence: 初稿把 explain/trial 当收尾项，未要求每波自带最小 evidence gate
  - status: `merged`
- F5 `medium` `ambiguity`:
  - summary: decoded payload 虽归 Form，但还缺“不进入第五状态树”的负约束
  - evidence: 初稿只讲 ownership，没有明确单一真相约束
  - status: `merged`
- F6 `medium` `controversy`:
  - summary: residual host projection 仍混在主收敛波次里，存在 projection creep 回流口
  - evidence: 初稿 Wave C 同时承接 explain/trial 与 host projection
  - status: `merged`

### Counter Proposals

- P1:
  - summary: `04` 压成“终局成功 contract + 顺序 + gate”的薄页
  - why_better: 删除重复 contract，消除第二 authority
  - overturns_assumptions: `A2`
  - resolves_findings: `F1, F2, F6`
  - supersedes_proposals:
  - dominance: `dominates`
  - axis_scores:
    - concept-count: `better`
    - public-surface: `better`
    - compat-budget: `better`
    - migration-cost: `better`
    - proof-strength: `better`
    - future-headroom: `better`
  - status: `adopted`
- P2:
  - summary: 先冻结 `single-chain / single-truth / verification-feed / surface-compression` 四条硬门，再把缺口降成派生工作包
  - why_better: 把计划从 feature checklist 拉回目标函数
  - overturns_assumptions: `A2`
  - resolves_findings: `F1, F4, F5`
  - supersedes_proposals:
  - dominance: `dominates`
  - axis_scores:
    - concept-count: `better`
    - public-surface: `better`
    - compat-budget: `better`
    - migration-cost: `same`
    - proof-strength: `much-better`
    - future-headroom: `better`
  - status: `adopted`
- P3:
  - summary: Wave A 只做 `presence + 完整列表结构编辑代数 + 最小 evidence gate`，Wave B 冻结 `async validation lane + decoded submit + submit gate + $form`，Wave C 只收口解释投影
  - why_better: 消除 `$form` 半定义阶段，并让每一波都带最小 verification gate
  - overturns_assumptions: `A5`
  - resolves_findings: `F3, F4, F6`
  - supersedes_proposals:
  - dominance: `dominates`
  - axis_scores:
    - concept-count: `better`
    - public-surface: `better`
    - compat-budget: `better`
    - migration-cost: `better`
    - proof-strength: `better`
    - future-headroom: `better`
  - status: `adopted`
- P4:
  - summary: decoded payload 仅作为 submit-lane output，不进入第五状态面
  - why_better: 守住单一真相，堵上状态面漂移
  - overturns_assumptions: `A4`
  - resolves_findings: `F5`
  - supersedes_proposals:
  - dominance: `dominates`
  - axis_scores:
    - concept-count: `better`
    - public-surface: `same`
    - compat-budget: `same`
    - migration-cost: `same`
    - proof-strength: `better`
    - future-headroom: `better`
  - status: `adopted`

### Resolution Delta

- `A2` -> `overturned`
- `A4` -> `overturned`
- `A5` -> `overturned`
- `P1/P2/P3/P4` -> `adopted`
- `04-convergence-direction.md` 已按 adopted candidate 重写

## Adoption

- adopted_candidate: `SYN-1 contract-first thin convergence page`
- lineage: `P1 + P2 + P3 + P4`
- rejected_alternatives: `ALT-A2-2, ALT-A3-2`
- rejection_reason: `只修局部顺序或保留厚页结构，未彻底消掉第二 authority 与目标函数漂移`
- dominance_verdict: `SYN-1 通过 Ramanujan / Kolmogorov / Godel 三重 gate，并在 concept-count, public-surface, proof-strength 上形成严格改进`

### Freeze Record

- adopted_summary: `04 仅保留终局成功 contract、收敛顺序、freeze gate 与 proof obligations；缺口定义、owner split 与 boundary 全部回链到 02/03/06`
- kernel_verdict: `通过。新文本压掉重复 contract，去除了 kernel 独立 roadmap 与 Form 本地 trial contract，并把每波的 verification-feed 变成硬门`
- frozen_decisions:
  - `single-chain / single-truth / verification-feed / surface-compression` 是 04 的四条硬门
  - `kernel` 只作为 enabling constraint，不再作为独立第二优先级
  - `$form` 正式 freeze 后移到 Wave B
  - 每一波都必须交付最小 explain / evidence gate
  - `decoded payload` 仅作为 submit-lane output，不进入第五状态面
  - `residual host projection` 移出主收敛波次，后置到 backlog
- non_goals:
  - `04` 不再重写 gap 定义
  - `04` 不再重写 owner split
  - `04` 不定义新的 Form 专属 trial contract
  - `host sugar` 不进入主收敛波次
- allowed_reopen_surface:
  - `四条硬门是否足够`
  - `Wave A / B / C 的 bundle 切分是否仍可被更优方案直接支配`
  - `每波最小 explain/evidence gate 是否仍有遗漏`
- proof_obligations:
  - 每个 wave 必须可被 `runtime.trial / runtime.compare` 消化
  - 不得重新抬升 lowering 术语成独立公开目标
  - 不得让 decoded payload 变成第五状态树
  - backlog 与主收敛波次必须继续分开
- delta_from_previous_round: `把厚页计划压成 contract-first 薄页，并把 success contract 前置`

## Round 2

### Phase

- `converge`

### Input Residual

- `04` 是否仍残留超过 freeze record 的重复 authority
- adopted candidate 是否已经足够薄

### Findings

- F7 `medium` `ambiguity`:
  - summary: `04` 虽已压缩，但正文仍残留一部分 owner / gap 语义重述，与 freeze record 的“contract-first thin page”不完全一致
  - evidence: A2、A3 converge 仍指出 `04` 在该轮修订后保留了过多实体语义
  - status: `closed`

### Counter Proposals

- P5:
  - summary: 再压一刀，只保留 `contract + order + wave gates + proof obligations`，删除 residual duplicate contract
  - why_better: 进一步降低第二 authority 风险，使 `04` 更贴合 freeze record
  - overturns_assumptions:
  - resolves_findings: `F7`
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

- `F7` -> `closed`
- `P5` -> `adopted`
- `04-convergence-direction.md` 再压薄一轮

## Round 3

### Phase

- `converge`

### Input Residual

- `04` 是否已满足 thin-page freeze record

### Findings

- none

### Counter Proposals

- none

### Resolution Delta

- all residual findings `closed`

## Consensus

- reviewers: `A1, A2, A3, A4`
- adopted_candidate: `SYN-1 contract-first thin convergence page`
- final_status: `closed`
- stop_rule_satisfied: `true`
- residual_risk:
  - `Wave A` 最小 verification-feed 不得再次膨胀成完整 `$form` 公开面
  - `Wave C` 不得重新被写成 Form 本地 trial contract
  - kernel enabling constraint 与 host sugar 后续细化时仍需持续后置
