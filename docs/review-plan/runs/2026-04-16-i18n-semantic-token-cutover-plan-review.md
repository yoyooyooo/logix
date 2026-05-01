# I18n Semantic Token Cutover Plan Review Ledger

## Meta

- target: `docs/superpowers/plans/2026-04-16-i18n-semantic-token-cutover.md`
- targets:
  - `docs/superpowers/plans/2026-04-16-i18n-semantic-token-cutover.md`
- source_kind: `file-plan`
- reviewers: `A1, A2, A3, A4`
- round_count: `2`
- challenge_scope: `open`
- consensus_status: `closed`

## Bootstrap

- target_complete: `authority target=i18n semantic token cutover implementation plan; bound inputs include runtime/08, the consumed form+i18n proposal, current i18n token/service code, tests, and all directly affected examples`
- review_contract:
  - artifact_kind: `implementation-plan`
  - review_goal: `zero-unresolved`
  - target_claim: `under zero-user and forward-only assumptions, the i18n implementation plan should converge on a smallest terminal cutover path that removes token/render mixed ownership, collapses public render to one family, and closes the full impact set in one wave`
  - non_default_overrides: `challenge scope=open; public helper naming, root/service boundary, test layout, and impact-set completeness are all challengeable`
- review_object_manifest:
  - source_inputs:
    - `docs/superpowers/plans/2026-04-16-i18n-semantic-token-cutover.md`
    - `docs/ssot/runtime/08-domain-packages.md`
    - `docs/proposals/form-rule-i18n-message-contract.md`
    - `packages/i18n/src/internal/token/token.ts`
    - `packages/i18n/src/internal/driver/i18n.ts`
    - `packages/i18n/src/I18n.ts`
    - `packages/i18n/src/index.ts`
    - `packages/i18n/test/Token/MessageToken.test.ts`
    - `packages/i18n/test/I18n/ReadySemantics.test.ts`
    - `packages/i18n/test/I18n/I18n.RootSurfaceBoundary.test.ts`
    - `packages/i18n/test/I18n/I18n.ServiceFirstBoundary.test.ts`
    - `examples/logix/src/i18n-message-token.ts`
    - `examples/logix/src/i18n-async-ready.ts`
    - `examples/logix-react/src/modules/i18n-demo.ts`
    - `examples/logix-react/src/demos/I18nDemoLayout.tsx`
    - `specs/029-i18n-root-resolve/quickstart.md`
  - materialized_targets:
    - `docs/superpowers/plans/2026-04-16-i18n-semantic-token-cutover.md`
  - authority_target: `i18n-semantic-token-cutover-plan@2026-04-16`
  - bound_docs:
    - `docs/ssot/runtime/08-domain-packages.md`
    - `docs/proposals/form-rule-i18n-message-contract.md`
    - `packages/i18n/src/internal/token/token.ts`
    - `packages/i18n/src/internal/driver/i18n.ts`
    - `packages/i18n/src/I18n.ts`
    - `packages/i18n/src/index.ts`
    - `packages/i18n/test/Token/MessageToken.test.ts`
    - `packages/i18n/test/I18n/ReadySemantics.test.ts`
    - `packages/i18n/test/I18n/I18n.RootSurfaceBoundary.test.ts`
    - `packages/i18n/test/I18n/I18n.ServiceFirstBoundary.test.ts`
    - `examples/logix/src/i18n-message-token.ts`
    - `examples/logix/src/i18n-async-ready.ts`
    - `examples/logix-react/src/modules/i18n-demo.ts`
    - `examples/logix-react/src/demos/I18nDemoLayout.tsx`
    - `specs/029-i18n-root-resolve/quickstart.md`
  - derived_scope: `i18n package implementation plan only`
  - allowed_classes:
    - `token contract cutover`
    - `render service contract`
    - `root/service boundary`
    - `test and example strategy`
    - `impact-set closure`
    - `docs cutover`
    - `plan execution granularity`
  - blocker_classes:
    - `second token truth`
    - `second render contract`
    - `token/render mixed owner`
    - `compat shell`
    - `impact-set omission`
    - `planning shell inflation`
  - ledger_target: `docs/review-plan/runs/2026-04-16-i18n-semantic-token-cutover-plan-review.md`
- challenge_scope: `open`
- reviewer_set: `A1, A2, A3, A4`
- active_advisors: `A4`
- activation_reason: `目标涉及公共 helper 形态、长期治理、以及 i18n 终局 contract；需要直接挑战成功标准`
- max_reviewer_count: `4`
- kernel_council: `Ramanujan, Kolmogorov, Godel`
- dominance_axes: `concept-count, public-surface, compat-budget, migration-cost, proof-strength, future-headroom`
- stop_rule:
  - `Ramanujan gate`: 至少压掉一个实施对象、一个重复 contract、一个 compatibility shell、或一段靠解释维持的过渡态
  - `Kolmogorov gate`: `concept-count / public-surface / compat-budget` 不能整体变差；若核心轴不变，必须在 `proof-strength` 或 `future-headroom` 上形成严格改进
  - `Godel gate`: 不得引入第二 token truth、第二 render contract、第二 i18n facade、或未解释矛盾
- reopen_bar: `只有出现更小更强且能同时压掉 mixed owner、双 render contract 与 impact-set 缺口的候选时，才允许 reopen`
- ledger_path: `docs/review-plan/runs/2026-04-16-i18n-semantic-token-cutover-plan-review.md`
- writable: `true`

## Assumptions

- A1:
  - summary: `service.token` 留在 public service contract 不会造成 token/render mixed owner
  - status: `overturned`
  - resolution_basis: `A1/A2/A3/A4 交集都要求 token 构造固定回 package-level pure helper。`
- A2:
  - summary: `t/tReady` 与 token-oriented render helper 可以并存，仍不算第二 render contract
  - status: `overturned`
  - resolution_basis: `reviewers 一致要求公开 render contract 只剩一组。`
- A3:
  - summary: token contract cutover 与 render owner cutover 可以分波次执行
  - status: `overturned`
  - resolution_basis: `reviewers 一致要求 single-wave atomic cutover，避免 compat shell。`
- A4:
  - summary: root surface 约束与 docs sync 适合拆成独立任务或条件任务
  - status: `overturned`
  - resolution_basis: `A1/A2/A4 都要求把 root/task shells 删掉，把 docs sync 改成无条件 frozen fact cutover。`
- A5:
  - summary: 额外新增 `I18n.TokenRender.test.ts` 会提升 proof-strength
  - status: `overturned`
  - resolution_basis: `reviewers 要求把 render proof 合并回现有 `ReadySemantics.test.ts`，避免 proof surface 重复。`

## Round 1

### Phase

- `challenge`

### Input Residual

- none

### Findings

- F1 `critical` `invalidity`:
  - summary: 计划同时保留 `t/tReady` 并新增 token render helper，会留下双 render contract
  - evidence: `A1 + A2 + A3 + A4`
  - status: `merged`
- F2 `high` `invalidity`:
  - summary: 计划没有把 `service.token` 纳入 cutover，token owner 仍混在 root 和 service 之间
  - evidence: `A1 + A3 + A4`
  - status: `merged`
- F3 `high` `invalidity`:
  - summary: 计划把 token contract cutover 和 render helper cutover 拆成多波次，会制造 compat shell
  - evidence: `A1 + A2 + A4`
  - status: `merged`
- F4 `high` `ambiguity`:
  - summary: impact set 没闭合，遗漏了 service-boundary test、React example 和 quickstart
  - evidence: `A3 + A4`
  - status: `merged`
- F5 `medium` `invalidity`:
  - summary: 计划内嵌 root-surface 任务、新测试文件和 commit 壳层，实施对象膨胀
  - evidence: `A1 + A2 + A3`
  - status: `merged`

### Counter Proposals

- P1:
  - summary: `保持 token cutover + render helper 增量叠加方案`
  - why_better: `改动拆得更细`
  - overturns_assumptions:
  - resolves_findings:
  - supersedes_proposals:
  - dominance: `none`
  - axis_scores:
    - concept-count: `worse`
    - public-surface: `worse`
    - compat-budget: `worse`
    - migration-cost: `same`
    - proof-strength: `worse`
    - future-headroom: `worse`
  - status: `rejected`
- P2:
  - summary: `SYN-I18N-1 single-wave token-only surface cutover`
  - why_better: `一次性删除 public `service.token`、`t/tReady`、public canonicalizer，root 只保留 `token(...)`，service 只保留 `snapshot/changeLanguage/render/renderReady`，并同步跑完整 impact set`
  - overturns_assumptions: `A1, A2, A3, A4, A5`
  - resolves_findings: `F1, F2, F3, F4, F5`
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

### Resolution Delta

- 删除 `service.token`
- 删除 public `t/tReady`
- 公开 render contract 收口到 `render/renderReady`
- 删除 standalone root-surface task
- 删除 standalone `I18n.TokenRender.test.ts`
- 删除计划里的 VCS 壳层
- 把 `examples/logix-react/**`、`specs/029-i18n-root-resolve/quickstart.md` 并入 impact set
- docs sync 改成无条件 frozen fact cutover

## Adoption

- adopted_candidate: `SYN-I18N-1 single-wave token-only surface cutover`
- lineage: `A1-ALT-01 + A2-ALT-1/2/3 + A3-1 + ALT-A4-1`
- rejected_alternatives: `P1`
- rejection_reason: `双 render contract、mixed owner、compat shell 与 impact-set omission 都违反终局收口要求`
- dominance_verdict: `SYN-I18N-1 在 concept-count, public-surface, compat-budget, migration-cost, proof-strength, future-headroom 上形成直接改进，并通过 Ramanujan / Kolmogorov / Godel 三重 gate`

### Freeze Record

- adopted_summary: `i18n 实施计划按单 wave 终局 cutover 执行：root 只保留 token(...) 和 token types；service 只保留 snapshot、changeLanguage、render、renderReady；service.token、t、tReady、public canonicalizer 同波次退出；semantic token 只承接 key + params；fallback 只留在 render hints；所有 tests/examples/docs 同步收口。`
- kernel_verdict: `通过。当前最强方案是一次性压掉 mixed owner、双 render contract 和过渡壳层。`
- frozen_decisions:
  - root 只保留 `I18n`、`I18nTag`、`I18nSnapshotSchema`、`token(...)`、token types
  - `token(...)` 是唯一公开 token 构造入口
  - public canonicalizer 下沉到 internal
  - `I18nService` 只保留 `snapshot`、`changeLanguage`、`render`、`renderReady`
  - `service.token`、`t`、`tReady` 退出 public contract
  - semantic token contract 只承接 `key + params`
  - render fallback 只留在 render helper hints
  - `ReadySemantics.test.ts` 作为唯一 render contract proof 面
  - docs/examples/spec quickstart 同波次无条件更新
- non_goals:
  - 本轮不决定 `render/renderReady` 是否还能继续压缩命名
  - 本轮不决定 raw key render 是否保留 expert route
  - 本轮不处理 Form 包实现 cutover
- allowed_reopen_surface:
  - `render/renderReady` 的最终命名
  - raw key render 是否保留 expert route
  - `options -> params` 的最终发布迁移细节
- proof_obligations:
  - plan 中不得再出现第二 render family
  - impact set 必须闭合到 tests/examples/docs/spec quickstart
  - docs 不得再出现“过渡实现”“兼容层”“options 可保留”措辞
- delta_from_previous_round: `从增量 helper 叠加方案，压到单 wave token-only surface cutover`

## Round 2

### Phase

- `converge`

### Input Residual

- service contract 示例里仍保留 `instance`
- 头部模板仍默认要求 subagent

### Findings

- F6 `medium` `ambiguity`:
  - summary: service contract 示例与 boundary test 仍保留 `instance`
  - evidence: `A4 residual`
  - status: `closed`
- F7 `low` `ambiguity`:
  - summary: plan 头部仍保留默认 subagent 模板提示，和仓库执行约束冲突
  - evidence: `A3 residual`
  - status: `closed`

### Counter Proposals

- none

### Resolution Delta

- service contract 示例与 service boundary test 均删掉 `instance`
- 头部模板改成中性执行提示，只在显式启用 subagent 时切换

## Consensus

- reviewers: `A1, A2, A3, A4`
- adopted_candidate: `SYN-I18N-1 single-wave token-only surface cutover`
- final_status: `closed`
- stop_rule_satisfied: `true`
- residual_risk:
  - `render/renderReady` 的最终命名若后续继续收口，需要单独 reopen
  - raw key render 是否保留 expert route 仍未裁决
  - `options -> params` 的发布迁移若处理不净，仍可能留下实现侧旧入口引用
