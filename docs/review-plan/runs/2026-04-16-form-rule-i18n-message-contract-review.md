# Form Rule I18n Message Contract Review Ledger

## Meta

- target: `docs/proposals/form-rule-i18n-message-contract.md`
- targets:
  - `docs/proposals/form-rule-i18n-message-contract.md`
  - `docs/ssot/form/13-exact-surface-contract.md`
  - `docs/ssot/form/02-gap-map-and-target-direction.md`
  - `docs/ssot/form/03-kernel-form-host-split.md`
  - `docs/ssot/runtime/08-domain-packages.md`
  - `docs/ssot/runtime/09-verification-control-plane.md`
- source_kind: `file-ssot-contract`
- reviewers: `A1, A2, A3, A4`
- round_count: `2`
- challenge_scope: `open`
- consensus_status: `closed`

## Bootstrap

- target_complete: `authority target=form rule x i18n message contract; bound docs cover Form exact surface, Form reason contract, owner split, i18n package positioning, runtime verification control plane, and current package/token surfaces`
- review_contract:
  - artifact_kind: `ssot-contract`
  - review_goal: `zero-unresolved`
  - target_claim: `under zero-user and forward-only assumptions, Form rule-originated validation failures and i18n should converge on one smallest locale-neutral token contract, with rendered strings outside canonical truth and trial/compare staying on digest-only control-plane rails`
  - non_default_overrides: `challenge scope=open; i18n package itself is challengeable; migration pressure is near-zero`
- review_object_manifest:
  - source_inputs:
    - `docs/proposals/form-rule-i18n-message-contract.md`
    - `docs/ssot/form/13-exact-surface-contract.md`
    - `docs/ssot/form/02-gap-map-and-target-direction.md`
    - `docs/ssot/form/03-kernel-form-host-split.md`
    - `docs/ssot/runtime/08-domain-packages.md`
    - `docs/ssot/runtime/09-verification-control-plane.md`
    - `packages/logix-form/src/Rule.ts`
    - `packages/logix-form/src/internal/validators/index.ts`
    - `packages/i18n/src/internal/token/token.ts`
    - `packages/i18n/src/internal/driver/i18n.ts`
    - `packages/i18n/src/index.ts`
    - `packages/i18n/test/Token/MessageToken.test.ts`
    - `packages/logix-form/test/Rule/Form.Rule.Builtins.test.ts`
    - `examples/logix/src/i18n-message-token.ts`
    - `examples/logix/src/i18n-async-ready.ts`
  - materialized_targets:
    - `docs/proposals/form-rule-i18n-message-contract.md`
    - `docs/ssot/form/13-exact-surface-contract.md`
    - `docs/ssot/form/02-gap-map-and-target-direction.md`
    - `docs/ssot/form/03-kernel-form-host-split.md`
    - `docs/ssot/runtime/08-domain-packages.md`
    - `docs/ssot/runtime/09-verification-control-plane.md`
  - authority_target: `form-rule-i18n-message-contract@2026-04-16`
  - bound_docs:
    - `packages/logix-form/src/Rule.ts`
    - `packages/logix-form/src/internal/validators/index.ts`
    - `packages/i18n/src/internal/token/token.ts`
    - `packages/i18n/src/internal/driver/i18n.ts`
    - `packages/i18n/src/index.ts`
    - `packages/i18n/test/Token/MessageToken.test.ts`
    - `packages/logix-form/test/Rule/Form.Rule.Builtins.test.ts`
    - `examples/logix/src/i18n-message-token.ts`
    - `examples/logix/src/i18n-async-ready.ts`
  - derived_scope: `Form rule-originated validation failure message contract and i18n alignment only`
  - allowed_classes:
    - `rule message carrier`
    - `i18n token contract`
    - `render boundary ownership`
    - `reason feed leaf contract`
    - `trial/compare message policy`
    - `cross-domain authority alignment`
  - blocker_classes:
    - `second message contract`
    - `locale-frozen validation truth`
    - `validation depending on i18n runtime readiness`
    - `compare using rendered strings`
    - `i18n facade inflation`
    - `active planning anchor after consumption`
  - ledger_target: `docs/review-plan/runs/2026-04-16-form-rule-i18n-message-contract-review.md`
- challenge_scope: `open`
- reviewer_set: `A1, A2, A3, A4`
- active_advisors: `A4`
- activation_reason: `目标涉及两个领域包的组合合同、public contract、compare 规则与长期治理，需要直接挑战目标函数与 owner split`
- max_reviewer_count: `4`
- kernel_council: `Ramanujan, Kolmogorov, Godel`
- dominance_axes: `concept-count, public-surface, compat-budget, migration-cost, proof-strength, future-headroom`
- stop_rule:
  - `Ramanujan gate`: 至少压掉一个消息对象、一个重复 contract、或一个 locale-specific special case
  - `Kolmogorov gate`: `concept-count / public-surface / compat-budget` 不能整体变差；若核心轴不变，必须在 `proof-strength` 或 `future-headroom` 上形成严格改进
  - `Godel gate`: 不得引入第二 message truth、第二 i18n facade、第二 compare surface、或未解释矛盾
- reopen_bar: `只有出现更小更强且能同时压掉消息 carrier、render fallback 污染与 compare surface 扩张的候选时，才允许 reopen`
- ledger_path: `docs/review-plan/runs/2026-04-16-form-rule-i18n-message-contract-review.md`
- writable: `true`

## Assumptions

- A1:
  - summary: `string` sugar 留在 surviving public contract 里也不会伤害单一消息 carrier
  - status: `overturned`
  - resolution_basis: `A1/A2/A3/A4 交集都要求把 raw string 从 surviving public surface 删掉。`
- A2:
  - summary: `defaultValue` 一类 render fallback 可以留在 canonical token truth 中
  - status: `overturned`
  - resolution_basis: `四个 reviewer 一致要求 render fallback 退出 canonical truth 与 compare/evidence digest。`
- A3:
  - summary: `runtime.compare` 需要直接理解 token 细节才能算“只认 intent”`
  - status: `overturned`
  - resolution_basis: `reviewers 一致要求 compare 继续只认 digest，message token 只影响 evidence summary 归一化。`
- A4:
  - summary: 本轮可以同时冻结 rule、schema、manual、server error 的统一 carrier
  - status: `overturned`
  - resolution_basis: `reviewers 一致要求本轮 scope 缩到 rule-originated validation failures。`
- A5:
  - summary: proposal 在已回写 SSoT 后继续保留活的 review anchor 不影响 zero-unresolved
  - status: `overturned`
  - resolution_basis: `A4 converge 要求 proposal 只保留 adopted summary 与 reopen surface，不再保留待裁决锚点。`

## Round 1

### Phase

- `challenge`

### Input Residual

- none

### Findings

- F1 `high` `invalidity`:
  - summary: proposal 仍保留 `string` message、raw string residue 与多入口 message 输入，单一 carrier 未闭合
  - evidence: `A1 + A2 + A3 + A4`
  - status: `merged`
- F2 `high` `invalidity`:
  - summary: `defaultValue` 一类 render fallback 会把语言化 copy 重新带回 canonical truth
  - evidence: `A1 + A2 + A3 + A4`
  - status: `merged`
- F3 `high` `invalidity`:
  - summary: proposal 试图让 compare 直接理解 token 细节，和已冻结 control plane digest 主轴冲突
  - evidence: `A1 + A2 + A3 + A4`
  - status: `merged`
- F4 `medium` `ambiguity`:
  - summary: scope 没有封口，把 schema/manual/server error 一并写入未来统一叙述，会形成假 closed
  - evidence: `A3 + A4`
  - status: `merged`

### Counter Proposals

- P1:
  - summary: `保持 token reuse + string sugar + raw token compare`
  - why_better: `实现改动小`
  - overturns_assumptions:
  - resolves_findings:
  - supersedes_proposals:
  - dominance: `none`
  - axis_scores:
    - concept-count: `worse`
    - public-surface: `worse`
    - compat-budget: `same`
    - migration-cost: `same`
    - proof-strength: `worse`
    - future-headroom: `worse`
  - status: `rejected`
- P2:
  - summary: `SYN-MSG-1 strict token carrier + digest-only compare`
  - why_better: `把本轮 scope 压到 rule-originated failures，删掉 string carrier 与 render fallback 污染，让 compare 继续只认 digest`
  - overturns_assumptions: `A1, A2, A3, A4`
  - resolves_findings: `F1, F2, F3, F4`
  - supersedes_proposals:
  - dominance: `dominates`
  - axis_scores:
    - concept-count: `better`
    - public-surface: `better`
    - compat-budget: `better`
    - migration-cost: `same`
    - proof-strength: `better`
    - future-headroom: `better`
  - status: `adopted`

### Resolution Delta

- scope 收窄到 `rule-originated validation failures`
- `string` message 退出 surviving public surface
- custom `validate` canonical failure 收窄到 `I18nMessageToken | undefined`
- render fallback 退出 canonical truth
- message token 只影响 evidence summary 归一化
- compare 继续只认 digest

## Adoption

- adopted_candidate: `SYN-MSG-1 strict token carrier + digest-only compare`
- lineage: `A1-ALT-1 + A2-Alt-2 + A3-ALT-1 + A4-ALT-01/A4-ALT-02`
- rejected_alternatives: `P1`
- rejection_reason: `string carrier、fallback in token truth、raw token compare 都会带回第二消息合同和 locale-frozen truth`
- dominance_verdict: `SYN-MSG-1 在 concept-count, public-surface, compat-budget, proof-strength, future-headroom 上形成直接改进，并通过 Ramanujan / Kolmogorov / Godel 三重 gate`

### Freeze Record

- adopted_summary: `这是 Form 与 i18n 的跨领域组合合同。本轮只冻结 rule-originated validation failures。Form 规则消息的 canonical carrier 只剩单一 token contract；string message 退出 surviving public surface；render fallback 不进入 canonical truth；runtime.compare 继续只认标准 report 与 evidenceSummaryDigest，message token 只影响 evidence summary 归一化；i18n 继续保持 service-first + semantic token contract，不新增 validation façade。`
- kernel_verdict: `通过。当前最强方案是压掉 raw string 和 render fallback 污染，让消息 carrier、render owner 和 compare gate 各回单一位置。`
- frozen_decisions:
  - 本轮 scope 只收 `rule-originated validation failures`
  - builtins 默认走固定 key 路径与 token 覆写
  - `string` message 不再进入 surviving public surface
  - custom `validate` 的 canonical failure 只承认 `I18nMessageToken | undefined`
  - render fallback 不进入 Form canonical truth
  - message token 不进入 compare 主轴，只影响 evidence summary 归一化
  - rendered string 退出 compare 主轴
  - Form 持有 rule message token declaration；i18n 持有 token contract 与 render service
- non_goals:
  - 本轮不冻结 schema decode/manual/server error carrier
  - 本轮不决定 i18n token 字段名是否全面从 `options` 收口到 `params`
  - 本轮不定义 render fallback 的最终宿主 helper 形态
- allowed_reopen_surface:
  - schema decode/manual/server error 是否并入同一 carrier
  - i18n token 的最终字段名
  - render fallback 的最终宿主 helper 形态
- proof_obligations:
  - SSoT 不得再出现 string message 作为 surviving public contract
  - rendered string 不得回流到 compare 主轴
  - i18n 包不得为 Form 新增 validation façade
- delta_from_previous_round: `从 token reuse + string sugar + raw token compare，压到 strict token carrier + digest-only compare`

## Round 2

### Phase

- `converge`

### Input Residual

- proposal 仍保留活的 review anchor

### Findings

- F5 `medium` `ambiguity`:
  - summary: proposal 页在已消费状态下仍保留活的 review anchor
  - evidence: `A4 residual`
  - status: `closed`

### Counter Proposals

- none

### Resolution Delta

- proposal 改成 `status: consumed`
- proposal 删除 `review focus` 与“待 review”
- proposal 只保留 adopted summary 与 allowed reopen surface

## Consensus

- reviewers: `A1, A2, A3, A4`
- adopted_candidate: `SYN-MSG-1 strict token carrier + digest-only compare`
- final_status: `closed`
- stop_rule_satisfied: `true`
- residual_risk:
  - `schema decode/manual/server error` 后续若并入同一 carrier，必须继续守住单一 token carrier、render fallback 外置、digest-only compare
  - i18n token 字段名是否最终统一到 `params` 仍是 reopen 面
  - render fallback 的最终宿主 helper 形态若处理不当，可能再次把 copy 带回 canonical truth
