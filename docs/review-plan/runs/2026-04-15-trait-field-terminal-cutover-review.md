# Trait Field Terminal Cutover Review Ledger

## Meta

- target: `docs/superpowers/plans/2026-04-15-trait-field-terminal-cutover.md`
- source_kind: `file-plan`
- reviewer_count: `4`
- reviewer_model: `gpt-5.4`
- reviewer_reasoning: `xhigh`
- challenge_scope: `open`
- round_count: `3`
- consensus_status: `closed`

## Bootstrap

- target_complete: `true`
- challenge_scope: `open`
- reviewer_set: `A1 / A2 / A3 / A4`
- kernel_council: `Ramanujan / Kolmogorov / Godel`
- dominance_axes: `concept-count / public-surface / compat-budget / migration-cost / proof-strength / future-headroom`
- stop_rule: `workflow.md#stop-rule`
- reopen_bar: `only if dominance axes prove strict improvement and kernel gates pass`
- ledger_path: `docs/review-plan/runs/2026-04-15-trait-field-terminal-cutover-review.md`
- writable: `true`

## Assumptions

- A1:
  - summary: `这份 plan 可以直接修改目标 plan 文件本身，并以修订后的 plan 作为 adopted candidate 载体。`
  - status: `kept`
  - resolution_basis: `用户明确要求审这份方案，未限制只读。skill 默认允许直接改计划工件。`
- A2:
  - summary: `默认允许沉淀 ledger 到 docs/review-plan/runs/。`
  - status: `kept`
  - resolution_basis: `用户显式点名 plan-optimality-loop，skill 默认以 ledger 为正式产物。`
- A3:
  - summary: `challenge_scope=open，允许 reviewer 挑战目标、边界、成功标准。`
  - status: `kept`
  - resolution_basis: `用户要求多视角挑战方案，未冻结目标函数。`
- A4:
  - summary: `该目标涉及架构、public contract、breaking strategy 与长期治理，因此自动启用 A4。`
  - status: `kept`
  - resolution_basis: `符合 workflow 自动启用条件。`
- A5:
  - summary: `本轮只审计划工件，不开始实现。`
  - status: `kept`
  - resolution_basis: `skill 边界明确禁止开始实现。`
- A6:
  - summary: `删掉 FieldKernel / FieldRuntime wrapper 后，只需要改 Module.ts 和 InternalContracts.ts 两个主落点。`
  - status: `overturned`
  - resolution_basis: `主 agent 复核发现 BoundApiRuntime.ts、internal/runtime/core/module.ts、moduleFieldsExpertPath.ts 等仍直接依赖 wrapper 文件。`
- A7:
  - summary: `Form.install 的 source wiring 可直接改成声明期执行 effect。`
  - status: `overturned`
  - resolution_basis: `builder 声明区必须同步；直接在声明区执行 effect 的改法不成立，需改成同步注册函数。`
- A8:
  - summary: `内部测试目录统一改名属于本轮终局 cutover 的必要部分。`
  - status: `overturned`
  - resolution_basis: `该改动提高迁移成本，却不降低 public-surface，也不增强 proof-strength。`

## Round 1

### Phase

- challenge

### Input Residual

- none
- reviewer runtime status:
  - A1 reviewer spawn failed by platform request limit
  - A2 reviewer spawn failed by platform request limit
  - A3 reviewer spawn failed by platform request limit
  - A4 reviewer spawn failed by platform request limit

### Findings

- F1 `high` `invalidity`:
  - summary: `删除 wrapper 的核心任务漏掉了真实直接 import 点，executor 按原计划执行会在 core 内部留下一批编译断点。`
  - evidence:
    - `packages/logix-core/src/internal/runtime/core/BoundApiRuntime.ts`
    - `packages/logix-core/src/internal/runtime/core/module.ts`
    - `packages/logix-core/src/internal/runtime/core/moduleFieldsExpertPath.ts`
  - status: `closed`
- F2 `high` `invalidity`:
  - summary: `原 Task 5 提出的声明期 effect 执行改法与同步声明区约束冲突，计划本身不可执行。`
  - evidence:
    - `packages/logix-form/src/internal/form/install.ts`
    - `packages/logix-core/src/internal/field-runtime/index.ts`
  - status: `closed`
- F3 `medium` `controversy`:
  - summary: `原计划把高收益 surface cut 与低收益内部测试目录改名绑在一起，增加迁移成本且不提升 public/internal 边界。`
  - evidence:
    - 原 File Structure 包含 `packages/logix-core/test/FieldKernel/** -> test/internal/field-kernel/**`
    - 原 File Structure 包含 `packages/logix-core/test/FieldRuntime/** -> test/internal/field-runtime/**`
  - status: `closed`
- F4 `medium` `ambiguity`:
  - summary: `trait -> field 的 runtime / diagnostics 词汇重命名与 surface/domain 关门顺序未冻结，容易把语义重命名和结构 cutover 搅在一起。`
  - evidence:
    - 原 Task 2 位于 Chunk 1，默认会早于 Query/Form raw route 收口执行
  - status: `closed`
- F5 `medium` `controversy`:
  - summary: `原修订版仍给 Query/Form 保留多余 concept subpaths，和 root canonical surface 重复。`
  - evidence:
    - `packages/logix-query/package.json` 计划片段仍保留 `./Engine` 与 `./TanStack`
    - `packages/logix-form/package.json` 计划片段仍保留 `./Rule`、`./Error`、`./Path` 等 root 已覆盖出口
  - status: `closed`

### Counter Proposals

- P1:
  - summary: `先做硬边界 cut，再做 domain DSL 关门，最后才做 evidence/devtools 词汇统一。`
  - why_better: `把结构 cut 与术语 cut 分层，proof-strength 更高，迁移窗口更清晰。`
  - overturns_assumptions: `A6 A7`
  - resolves_findings: `F1 F2 F4`
  - supersedes_proposals: `baseline`
  - dominance: `dominates`
  - axis_scores:
    - concept-count: `better`
    - public-surface: `same`
    - compat-budget: `same`
    - migration-cost: `better`
    - proof-strength: `better`
    - future-headroom: `better`
  - status: `adopted`
- P2:
  - summary: `把内部测试目录纯命名改名移出本轮，保留对当前 cutover 直接相关的测试改动。`
  - why_better: `删除低收益噪音，避免 executor 在墓地清扫和核心边界之间来回切换。`
  - overturns_assumptions: `A8`
  - resolves_findings: `F3`
  - supersedes_proposals: `baseline`
  - dominance: `dominates`
  - axis_scores:
    - concept-count: `same`
    - public-surface: `same`
    - compat-budget: `same`
    - migration-cost: `better`
    - proof-strength: `same`
    - future-headroom: `same`
  - status: `adopted`
- P3:
  - summary: `把 Query exports 压到 root-only，把 Form exports 压到 root + react。`
  - why_better: `进一步缩小 public-surface，消掉与 root namespace 重复的 concept subpaths，且仓内没有实质消费者。`
  - overturns_assumptions: `none`
  - resolves_findings: `F5`
  - supersedes_proposals: `revised-baseline-r1`
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

- bootstrap frozen
- revised target plan to include omitted core import points
- revised Task 5 to use a failing boundary test and sync `registerOnMount(): void`
- removed internal test directory rename from scope
- added explicit precondition so Task 2 only starts after surface/domain closure
- compressed Query/Form package exports to the minimum surviving surfaces

## Adoption

- adopted_candidate: `revised-baseline-r2`
- lineage: `baseline -> revised-baseline-r1 -> revised-baseline-r2`
- rejected_alternatives:
  - `rename-core-test-directories-in-same-wave`
  - `run-terminology-cutover-before-domain-surface-closure`
- rejection_reason:
  - `前者没有压缩 public-surface，也没有增加 proof-strength`
  - `后者把结构问题和术语问题捆绑，违反更小、更可证的执行顺序`
- dominance_verdict: `revised-baseline-r2 dominates baseline and revised-baseline-r1 on public-surface and proof-strength while keeping core axes non-worse`

### Freeze Record

- adopted_summary: `保留“终局 cutover 一份 plan”这个大目标，但执行顺序固定为 surface wrapper demolition -> domain raw-route closure -> runtime evidence terminology -> docs/examples sweep；同时把 Query exports 压到 root-only，把 Form exports 压到 root + react，并删掉低收益目录改名。`
- kernel_verdict: `通过 Ramanujan/Kolmogorov/Godel gate`
- frozen_decisions:
  - `FieldKernel / FieldRuntime wrapper 删除仍是本轮硬目标`
  - `Form / Query raw route 删除仍是本轮硬目标`
  - `Task 5 必须走同步声明注册，不允许声明区执行 effect`
  - `内部测试目录纯命名改名退出本轮`
  - `Task 2 只有在 surface/domain 关门后才能启动`
  - `Query 不保留 Engine/TanStack concept subpaths`
  - `Form 不保留 Rule/Error/Path/FormView 等 concept subpaths，唯一 surviving subpath 是 react`
- non_goals:
  - `不在本轮重开 hot-path perf`
  - `不修 docs/archive`
  - `不把内部测试目录命名整洁度当作阻塞项`
- allowed_reopen_surface:
  - `若能证明 Query root namespace 内仍有可删除成员，且不会引入第二公开面；Form public surface 不再重开，固定为 root + react`
  - `若能证明 internal evidence label cut 仍被更小方案直接支配；public docs/examples terminology 继续由 inventory authority 封口，不再与 internal evidence reopen 混审`
- proof_obligations:
  - `修订后的计划必须覆盖全部 wrapper 直接 import 点`
  - `Task 5 的改法必须符合 Logic 同步声明区约束`
  - `最终 grep allowlist 必须与 inventory allowlist 一致`
  - `package exports boundary tests 必须证明 Query root-only、Form root + react`
- delta_from_previous_round: `patched target plan in place`

## Consensus

- reviewers: `A1 / A2 / A3 / A4`
- adopted_candidate: `revised-baseline-r2`
- final_status: `consensus reached`
- stop_rule_satisfied: `true`
- residual_risk:
  - `这仍是一条大波次 cutover，执行时必须严格按 chunk 顺序推进`
  - `最终证明义务仍落在 inventory allowlist、package exports boundary、pnpm typecheck、pnpm test:turbo、apps/docs build`

## Round 2

### Phase

- converge

### Input Residual

- `Task 2` 物理顺序不闭合
- `Task 1 / Task 9` grep 验收边界过宽

### Findings

- A2 reviewer:
  - `无 unresolved findings`
- A1 reviewer:
  - `Task 2` 物理顺序需后移
  - `Task 1` 与 `Task 9` grep 验收边界需收紧
- main-agent synthesis:
  - 已将 `Task 2` 物理移动到 `Task 5` 之后
  - 已把 `Task 1` grep 收紧到 core surface 边界
  - 已把 `Task 9` grep 收紧到 `packages/*/src examples apps/docs docs`

### Counter Proposals

- kept:
  - `Round 1 / P1`
  - `Round 1 / P2`
  - `Round 1 / P3`
- no new dominating proposal confirmed yet

### Resolution Delta

- `A1 residual` `closed`
- target plan patched in place for round 2 converge

## Round 3

### Phase

- converge

### Input Residual

- latest patched plan residual-only review

### Findings

- A1 latest reviewer:
  - `无 unresolved findings`
- A2 latest reviewer:
  - `无 unresolved findings`
- A3 latest reviewer:
  - `无 unresolved findings`
- A4 latest reviewer:
  - `无 unresolved findings`

### Counter Proposals

- none

### Resolution Delta

- all four reviewers returned `无 unresolved findings`
- no reopen triggered
- target plan unchanged after latest residual review
