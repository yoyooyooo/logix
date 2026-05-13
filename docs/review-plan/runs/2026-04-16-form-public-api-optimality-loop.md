# Form Public API Optimality Loop Ledger

## Meta

- target: `docs/ssot/form/README.md`
- targets: `docs/ssot/form/*.md`
- source_kind: `file-ssot-contract`
- reviewers: `A1, A2, A3, A4`
- round_count: `4`
- challenge_scope: `open`
- consensus_status: `closed`

## Bootstrap

- target_complete: `authority target=form SSoT doc family; bound surface=docs/ssot/runtime/01-public-api-spine.md, docs/ssot/runtime/03-canonical-authoring.md, docs/ssot/runtime/06-form-field-kernel-boundary.md, docs/ssot/runtime/10-react-host-projection-boundary.md, docs/standards/logix-api-next-guardrails.md, docs/internal/form-api-quicklook.md; prior evidence=docs/review-plan/runs/2026-04-16-form-declaration-builder-review.md, docs/review-plan/runs/2026-04-16-form-declaration-builder-review-v2.md`
- review_contract:
  - artifact_kind: `ssot-contract`
  - review_goal: `zero-unresolved`
  - target_claim: `under zero-user and forward-only assumptions, Form public API and all directly supporting public-facing boundaries should be re-derived and frozen around the strongest agent-first, minimal-concept, high-headroom contract; existing form, runtime, kernel, and north-star assumptions are all challengeable`
  - non_default_overrides: `agent comfort outranks human comfort; challenge scope stays open across public contract, owner split, kernel backpressure, host manifestation, verification touchpoints, and even target function itself; compatibility and migration are near-zero by baseline`
- review_object_manifest:
  - source_inputs: `docs/ssot/form/*.md + docs/internal/form-api-quicklook.md + prior freeze records`
  - materialized_targets: `docs/ssot/form/*.md`
  - authority_target: `form-public-api-family@2026-04-16`
  - bound_docs:
    - `docs/ssot/runtime/01-public-api-spine.md`
    - `docs/ssot/runtime/03-canonical-authoring.md`
    - `docs/ssot/runtime/06-form-field-kernel-boundary.md`
    - `docs/ssot/runtime/10-react-host-projection-boundary.md`
    - `docs/standards/logix-api-next-guardrails.md`
    - `docs/internal/form-api-quicklook.md`
  - derived_scope: `full Form external API contract and all directly supporting boundary docs`
  - allowed_classes:
    - `north-star and target-function challenge`
    - `authority model`
    - `exact surface`
    - `family law and slot law`
    - `kernel backpressure and owner split`
    - `host manifestation and projection`
    - `scenario formulas and witness sufficiency`
    - `verification-facing public touchpoints`
    - `cross-doc term alignment`
  - blocker_classes:
    - `living planning anchor`
    - `old vocabulary residue`
    - `fake-closed contract`
    - `stale prior ledger influence`
    - `multiple authority sources`
    - `second public contract`
    - `public/internal boundary leak`
    - `agent-hostile ceremony`
    - `kernel-driven public distortion`
  - ledger_target: `docs/review-plan/runs/2026-04-16-form-public-api-optimality-loop.md`
- challenge_scope: `open`
- reviewer_set: `A1, A2, A3, A4`
- active_advisors: `A4`
- activation_reason: `目标涉及 public contract、长期治理、breaking strategy、north-star challenge；用户明确要求激进挑战目标函数本身`
- max_reviewer_count: `4`
- kernel_council: `Ramanujan, Kolmogorov, Godel`
- dominance_axes: `concept-count, public-surface, compat-budget, migration-cost, proof-strength, future-headroom`
- stop_rule:
  - `Ramanujan gate`: 至少压掉一个公开概念、一个重复 contract、一个边界例外，或一个仅为 kernel 妥协暴露出来的 public 负担
  - `Kolmogorov gate`: `concept-count / public-surface / compat-budget` 不能整体变差；若核心轴不变，必须在 `proof-strength` 或 `future-headroom` 上形成严格改进
  - `Godel gate`: 不得引入第二 authority、第二 workflow、第二 exact surface、第二 host truth，或未解释矛盾
- reopen_bar: `freeze 之后只有在 dominance axes 上被更小更强方案直接支配，且通过三重 gate 时才允许 reopen`
- ledger_path: `docs/review-plan/runs/2026-04-16-form-public-api-optimality-loop.md`
- writable: `true`

## Assumptions

- A1:
  - summary: `Form 子树当前北极星、authority model 与 exact surface 组合，已接近最优，只需小修`
  - status: `overturned`
  - resolution_basis: `A1/A2/A3/A4 的交集都表明当前 contract 仍存在第二 declaration carrier、过大的目标函数、impure exact surface 与 derived page 反向定义 core contract 的问题。`
- A2:
  - summary: `Form 的最优公开面应继续以现有 builder + scope + submit + form handle + react sugar 为主公式`
  - status: `merged`
  - resolution_basis: `builder + scope + submit + form handle 继续保留为核心主链；React sugar 退出 core target function，改为 package-local manifestation。`
- A3:
  - summary: `runtime/06 与 runtime/10 只需作为边界页，不会反向限制更优的 Form external API`
  - status: `overturned`
  - resolution_basis: `A3 的证据成立：Form blueprint 与 host acquisition 需要和 runtime spine 对齐，不能自带第二 host truth。`
- A4:
  - summary: `agent-first + human-aesthetic + high-headroom 这组目标函数当前没有内在冲突`
  - status: `overturned`
  - resolution_basis: `A4 的证据成立：human-aesthetic 当前不应进入 core authority target，应降到 derived acceptance。`

## Round 1

### Phase

- `challenge`

### Input Residual

- none

### Findings

- F1 `critical` `invalidity`:
  - summary: 当前文档族仍保留第二 declaration contract，`00/04` 的旧 `logic:` 公式与 `13/runtime-06` 的位置参数 builder 已发生正面冲突
  - evidence: `A1 + A2 + 本地交叉检查`
  - status: `merged`
- F2 `critical` `invalidity`:
  - summary: 当前目标函数过大，把 React manifestation、human-facing 审美与 full doc-family zero-unresolved 过早并入 core target，导致 challenge 先天失焦
  - evidence: `A4 + A2`
  - status: `merged`
- F3 `high` `ambiguity`:
  - summary: `13` 同时承接 surviving exact surface、closed drift、projection helper 细节与 host 命名快照，exact boundary 不纯
  - evidence: `A1 + A2 + A3`
  - status: `merged`
- F4 `high` `invalidity`:
  - summary: authority / slot / proof / freeze gate 在 sibling pages 间重复展开，重复已经长成第二 contract
  - evidence: `A1 + A2`
  - status: `merged`
- F5 `high` `controversy`:
  - summary: Form blueprint、runtime handle 与 React acquisition 的关系不够清晰，存在第二 host truth 风险
  - evidence: `A3`
  - status: `merged`
- F6 `medium` `ambiguity`:
  - summary: walkthrough、export mirror、scenario proof pages 仍用过强的 proposal / helper noun 口气，容易把 stale teaching 回流成 authority
  - evidence: `A1 + A2 + A3`
  - status: `merged`

### Counter Proposals

- P1:
  - summary: `保持 current contract，只补少量 stale wording`
  - why_better: `改动小`
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
  - summary: `继续 full doc-family zero-unresolved 一把收口`
  - why_better: `看起来一步到位`
  - overturns_assumptions:
  - resolves_findings:
  - supersedes_proposals:
  - dominance: `partial`
  - axis_scores:
    - concept-count: `worse`
    - public-surface: `same`
    - compat-budget: `same`
    - migration-cost: `same`
    - proof-strength: `partial`
    - future-headroom: `same`
  - status: `rejected`
- P3:
  - summary: `SYN-17 core-first contract contraction`
  - why_better: `先缩目标函数，再统一 declaration carrier，再纯化 13 与 drift mirror，最后再收 derived proof/mirror pages`
  - overturns_assumptions: `A1, A3, A4`
  - resolves_findings: `F1, F2, F3, F6`
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
- P4:
  - summary: `BA1 strict host alignment`
  - why_better: `把 Form blueprint 与 runtime spine 完全对齐，继续压缩第二 host truth 风险`
  - overturns_assumptions: `A3`
  - resolves_findings: `F5`
  - supersedes_proposals:
  - dominance: `partial`
  - axis_scores:
    - concept-count: `better`
    - public-surface: `same`
    - compat-budget: `same`
    - migration-cost: `same`
    - proof-strength: `better`
    - future-headroom: `better`
  - status: `deferred`

### Resolution Delta

- `A1` -> `overturned`
- `A2` -> `merged`
- `A3` -> `overturned`
- `A4` -> `overturned`
- `P3` -> `adopted`
- core authority docs 已改写为 target-function contraction + single declaration carrier + pure exact surface
- `FormProgram` 已进入 13，作为 program-compatible blueprint 命名
- projection helper member exact freeze 已从 13 撤回到 proof gate
- walkthrough 与 export manifest 已降到 mirror / placeholder 语气

## Adoption

- adopted_candidate: `SYN-17 core-first contract contraction`
- lineage: `A4-ALT1 + A4-ALT3 + ALT-01 + ALT-02 + ALT-A2-5 + BA2`
- rejected_alternatives: `P1, P2`
- rejection_reason: `继续按旧目标函数与 full doc-family 一把收口，会让 derived page 和 stale wording 持续反向定义 core contract`
- dominance_verdict: `SYN-17 在 concept-count, public-surface, proof-strength, future-headroom 上形成直接改进，并通过 Ramanujan / Kolmogorov / Godel 三重 gate`

### Freeze Record

- adopted_summary: `本轮先收 core authority：缩目标函数、统一 declaration carrier、纯化 exact surface、把 drift/teaching/proof 页面降回 supporting or mirror；derived page 的 zero-unresolved 延后到下一轮 residual converge`
- kernel_verdict: `通过。当前最强候选先压缩 core target，再回写 sibling pages；不让 React、proposal wording 或 repeated gate 继续反向定义 Form public contract`
- frozen_decisions:
  - core target function 先以 `authoring-determinism / evidence-determinism / host-separability` 收口
  - `Form.make(id, config, ($) => { ... })` 成为唯一 declaration carrier
  - `13` 只保留 surviving exact surface，不再承担 closed drift inventory
  - `12` 降为 package drift mirror
  - projection exact freeze 当前只保留 `view()` acquisition 与 opaque boundary
  - walkthrough 只承接 contract mirror 与 placeholder helper slot
- non_goals:
  - 本轮不完成 06/07/08/09/10/11 的全量压缩
  - 本轮不开始实现代码 cutover
  - 本轮不强行冻结 `useForm` 是否继续停在 exact surface 的最终地位
  - 本轮不一次性消灭所有旧 taxonomy
- allowed_reopen_surface:
  - `FormProgram` 与 runtime spine 的最终对齐方式
  - `useForm` 在 exact surface 中的最终地位
  - `summary / path / explain` 是否需要重新升格为 exact projection member
  - `06 / 07 / 08 / 09 / 10 / 11` 的 taxonomy 压缩与 gate 收口
- proof_obligations:
  - derived proof / mirror pages 不得继续反向定义 core contract
  - 任何 projection helper 升格都必须补齐 reason contract proof
  - 任何 host acquisition 结论都必须证明不会长第二 host truth
  - 任何新 noun 都必须通过 10 的 promotion proof
- delta_from_previous_round: `从 full doc-family open challenge，压缩到 core-first contraction；先修 core authority，再收 derived residual`

## Round 2

### Phase

- `converge`

### Input Residual

- `useForm` 与 runtime canonical host formula 的关系未闭环
- `13` 仍承载 host 名称层
- `06 / 11 / walkthrough` 仍保留过重 mirror / taxonomy
- ledger manifest 自身重复过重

### Findings

- F7 `high` `controversy`:
  - summary: host acquisition 仍可能长第二 host truth
  - evidence: `A3 + A4`
  - status: `closed`
- F8 `medium` `ambiguity`:
  - summary: `06 / 11 / walkthrough` 仍保留 mirror / taxonomy 冗余
  - evidence: `A1 + A2`
  - status: `closed`
- F9 `medium` `ambiguity`:
  - summary: review manifest 清单重复过重
  - evidence: `A2`
  - status: `closed`

### Counter Proposals

- `none`

### Resolution Delta

- `13` 把 host hook 名从 core exact surface 撤回到 host path boundary
- `06` 压缩为纯 witness matrix
- `11` 压缩为 scenario mapping mirror
- walkthrough 降低 authority 语气，明确 helper placeholder
- ledger manifest 压缩为 `docs/ssot/form/*.md` doc family

## Round 3

### Phase

- `converge`

### Input Residual

- `useForm` 与 runtime canonical host formula 仍缺硬映射
- walkthrough 仍需要进一步去 authority 化
- `11` 仍残留页内 formula authority 与 shorthand taxonomy

### Findings

- F10 `high` `controversy`:
  - summary: host acquisition 缺少 `useModule(formProgram, options?)` 的硬映射
  - evidence: `fresh blocker-check H1 + A3 residual`
  - status: `closed`
- F11 `medium` `ambiguity`:
  - summary: walkthrough 仍保留过强 mirror 正文
  - evidence: `A2 + A3`
  - status: `closed`
- F12 `medium` `ambiguity`:
  - summary: `11` 仍残留第二层 formula taxonomy
  - evidence: `A1 + fresh blocker-check H2/H3/H4`
  - status: `closed`

### Counter Proposals

- `none`

### Resolution Delta

- `13` 明确写死 `useForm(formProgram, options?) = useModule(formProgram, options?)`
- walkthrough 明确写死同一 alias 关系，并继续降为 non-freeze mirror
- `11` 移除 `F1/F2/F3/C1` formula taxonomy，只保留 case-to-authority mapping
- `11` 进一步删除 overlay 维度，避免第二分类轴

## Round 4

### Phase

- `converge`

### Input Residual

- final blocker-check only

### Findings

- none

### Counter Proposals

- none

### Resolution Delta

- `fresh blocker-check H1`：无 unresolved findings
- `fresh blocker-check H5`：无 unresolved findings
- final residual 收敛到 `closed`

## Consensus

- reviewers: `A1, A2, A3, A4`
- adopted_candidate: `SYN-17 core-first contract contraction`
- final_status: `closed`
- stop_rule_satisfied: `true`
- residual_risk:
  - 当前真实 API 与 supporting docs 并行期间，若有人重新把 host sugar、projection helper 或 scenario mapping 升成独立 authority，第二 contract 仍可能回流
  - 后续新增 case 时，`11` 只能继续做 case-to-authority mapping，不能重新长出 formula、preset 或 overlay taxonomy
