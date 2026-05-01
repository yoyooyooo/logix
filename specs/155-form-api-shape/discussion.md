# Form API Shape Discussion

**Purpose**: 承接 `155` 的 active challenge queue、候选 lineage、reopen evidence 与下一轮评审入口。  
**Status**: Working  
**Feature**: [spec.md](./spec.md)

## Rules

- 本文件只承接 working material，不代持稳定原则。
- 稳定原则、稳定拒绝方向、promotion gate 统一回写到 `spec.md`。
- 当前最强候选的完整叙事统一落在独立候选页。
- `149 / 150 / 151 / 152 / 153 / 154` 的可保留语义已经拆解吸收到 `spec.md`、`candidate-ac3.3.md` 与相关 challenge briefs。
- 长期 ToB pressure corpus 统一看 [docs/ssot/form/06-capability-scenario-api-support-map.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/form/06-capability-scenario-api-support-map.md) 的 `SC-*` 主矩阵；`scenario-proof-family.md` 只保留 `WF* / W*` 投影视图。
- 只有通过 strict-dominance gate 的新候选，才允许替换 active candidate。
- 后续所有新方向都必须同时过 `single-evidence-backlinked local-soft-fact lane` 与 `optimization-headroom` 两道门；`less-system-split` 只算外显收益。
- `AC3.3` 当前已经做过 `hard law / soft recipe / optional sugar` 三分审查；后续 challenge 必须先说明自己挑战的是哪一层，禁止把 recipe/sugar 偏好直接抬成顶层 reopen。
- `monolithic return object` 当前已降回 implementation baseline sketch / recipe；它不再代表 hard contract。
- read-side 继续只认 `single host gate + selector-support artifact taxonomy`；helper 删除与否只算后续优化动作，不再先于 principle freeze。

## Active Candidate

- active candidate：`[candidate-ac3.3.md](./candidate-ac3.3.md)`
- implementation baseline：`[candidate-ac3.3.md](./candidate-ac3.3.md)`
- scenario proof family projection：`[scenario-proof-family.md](./scenario-proof-family.md)`，来源为 `06` 的 `SC-*` 主矩阵
- current status：plateau
- current verdict：`AC3.3 companion-residual-closed`
- review overlay：`[top-level-challenger-inbox.md#h007-owner-matrix--capability-lattice](./top-level-challenger-inbox.md#h007-owner-matrix--capability-lattice)`
- current blockers：
  - implementation trace evidence
  - 不可分解的 roster-level soft fact proof
  - actual code / empirical evidence

## Lineage Snapshot

当前 lineage 只保留最关键的几级台阶：

- `AC1`：boundary-only / proof-first / no shadow authority
- `AC2`：owner-attached skeleton 优先于 standalone primitive
- `AC3`：`companion` 成为总骨架
- `AC3.1`：收口到 `companion-only skeleton`
- `AC3.2`：收口到 `lower + value/deps/source + current bundle-return sketch`
- `AC3.3`：补齐 `field-only sufficiency`、`landing defer`、`slot reduction law`、`runtime invariants`

## Rejected Directions Snapshot

下面这些方向已经退出主搜索空间：

- generic `watch / computed`
- 把本地协调塞进 `source`
- 组件侧 canonical glue
- `choices / candidates / options / lookup` 充当总骨架
- `interaction` 作为 Form public noun
- `field/list/root` 全开 local-soft-fact family
- slot registry、slot selector family、多次 merge
- 现在就冻结 exact `ui` path
- 在 reduction failure 之前放行第三 slot

## Active Challenge Queue

### C-READ. Read-Side Convergence

- target：把 authority 现有读侧对象和 `155` 的 selector-only 主链并拢成单一教学主路
- status：freeze-recorded
- current verdict：`principle first`
- latest ledger：`../../docs/review-plan/runs/2026-04-22-form-api-shape-read-side-convergence-review.md`
- frozen direction：
  - canonical host gate 继续只认 `useModule + useSelector(handle, selector, equalityFn?)`
  - `fieldValue / rawFormMeta / Form.Error.field` 继续保留，但只能按 selector-support artifact taxonomy 解释
  - `fieldValue` 继续只算 adjunct convenience 与 reopen target
  - `rawFormMeta` 继续只算 raw trunk adjunct
  - `Form.Error.field` 继续只算 form-owned selector primitive / explain-support primitive
  - row-heavy exact read carrier 继续 deferred，`byRowId-first` 继续只算 reopen bias
- next residual：
  - whether authority docs can be further compressed after principle freeze
  - whether `signoff-brief` still needs a thinner read-side snapshot

### C-TRACE. Implementation Trace Evidence Pack

- target：把 `source -> lower -> bundle patch -> selector read -> rule/submit outcome` 做成可运行 proof design
- brief：`[challenge-implementation-trace-evidence-pack.md](./challenge-implementation-trace-evidence-pack.md)`
- ledger：`../../docs/review-plan/runs/2026-04-22-form-api-shape-implementation-trace-evidence-pack.md`
- status：freeze-recorded
- current verdict：`not-ready`
- current blocker：
  - contract layer 已冻结到 `TRACE-S1 / TRACE-S2 / TRACE-S3 / TRACE-S4 / TRACE-S5`
  - closed implementation execution：`TRACE-I1 implementation proof execution law`
  - closed benchmark evidence：`TRACE-I2 benchmark evidence law`
  - active residual：缺 actual code / empirical evidence
  - current execution map：`[trace-i1-evidence-map.md](./trace-i1-evidence-map.md)`
  - current gap ledger：`../../docs/review-plan/runs/2026-04-22-form-api-shape-trace-i1-gap-ledger.md`
- closed scenario carrier delta：
  - `ScenarioExecutionCarrier = ScenarioCompiledPlan + ScenarioRunSession`
  - `ScenarioCarrierEvidenceFeed`
  - `FixtureIdentityTable + row-heavy acceptance law`
  - benchmark reuse 只承接 execution carrier reuse，不承接 perf truth
- contract router brief：`[challenge-runtime-scenario-compare-substrate.md](./challenge-runtime-scenario-compare-substrate.md)`
- contract router ledger：`../../docs/review-plan/runs/2026-04-22-form-api-shape-runtime-scenario-compare-substrate.md`
- implementation router brief：`[challenge-implementation-trace-evidence-pack.md](./challenge-implementation-trace-evidence-pack.md)`
- implementation router ledger：`../../docs/review-plan/runs/2026-04-22-form-api-shape-implementation-trace-evidence-pack.md`
- closed summary brief：`[challenge-runtime-causal-links-summary-law.md](./challenge-runtime-causal-links-summary-law.md)`
- closed summary ledger：`../../docs/review-plan/runs/2026-04-22-form-api-shape-runtime-causal-links-summary-law.md`
- closed diff brief：`[challenge-runtime-row-level-summary-diff-substrate.md](./challenge-runtime-row-level-summary-diff-substrate.md)`
- closed diff ledger：`../../docs/review-plan/runs/2026-04-22-form-api-shape-runtime-row-level-summary-diff-substrate.md`
- closed id brief：`[challenge-runtime-deterministic-opaque-id-law.md](./challenge-runtime-deterministic-opaque-id-law.md)`
- closed id ledger：`../../docs/review-plan/runs/2026-04-22-form-api-shape-runtime-deterministic-opaque-id-law.md`
- closed scenario carrier brief：`[challenge-runtime-scenario-execution-carrier.md](./challenge-runtime-scenario-execution-carrier.md)`
- closed scenario carrier ledger：`../../docs/review-plan/runs/2026-04-22-form-api-shape-runtime-scenario-execution-carrier.md`
- closed compare brief：`[challenge-runtime-compare-truth-substrate.md](./challenge-runtime-compare-truth-substrate.md)`
- closed compare ledger：`../../docs/review-plan/runs/2026-04-22-form-api-shape-runtime-compare-truth-substrate.md`
- closed execution brief：`[challenge-runtime-scenario-proof-execution.md](./challenge-runtime-scenario-proof-execution.md)`
- closed execution ledger：`../../docs/review-plan/runs/2026-04-22-form-api-shape-runtime-implementation-proof-execution.md`
- closed benchmark brief：`[challenge-runtime-benchmark-evidence.md](./challenge-runtime-benchmark-evidence.md)`
- closed benchmark ledger：`../../docs/review-plan/runs/2026-04-22-form-api-shape-runtime-benchmark-evidence.md`
- required proof：
  - write / clear / retire 可观测
  - sourceReceiptRef / derivationReceiptRef / bundlePatchRef 可区分
  - row-heavy reorder / replace / active exit 至少覆盖一个高压场景
  - reasonSlotId 能回链 patch
  - 可作为后续 benchmark substrate
- desired output：implementation evidence map + gap ledger + next wave cuts

### C000. AC4 Top-Level Direction Scan

- target：发散一批新的 `AC4.*` 顶层候选，检查是否存在能严格支配 `AC3.3` 的主方向
- brief：`[challenge-ac4-top-level-direction-scan.md](./challenge-ac4-top-level-direction-scan.md)`
- ledger：`../../docs/review-plan/runs/2026-04-22-form-api-shape-ac4-top-level-direction-scan.md`
- status：freeze-recorded
- current verdict：`no strictly better top-level public direction yet; AC4.1 remains a parked lexical challenger`
- parked challengers：
  - `[candidate-ac4-field-fact-lane.md](./candidate-ac4-field-fact-lane.md)`
- review overlay：
  - `[top-level-challenger-inbox.md#h007-owner-matrix--capability-lattice](./top-level-challenger-inbox.md#h007-owner-matrix--capability-lattice)`
- rejected challengers：
  - `[candidate-ac4-no-public-companion-program-lowered.md](./candidate-ac4-no-public-companion-program-lowered.md)`
  - `[candidate-ac4-field-capability-block.md](./candidate-ac4-field-capability-block.md)`
  - `[candidate-ac4-field-slot-projection-lane.md](./candidate-ac4-field-slot-projection-lane.md)`
- next compare：`AC4 champion challenger compare`
- next compare brief：`[challenge-ac4-champion-challenger-compare.md](./challenge-ac4-champion-challenger-compare.md)`
- next compare ledger：`../../docs/review-plan/runs/2026-04-22-form-api-shape-ac4-champion-challenger-compare.md`
- next expansion：`AC4 top-level expansion wave 2`
- next expansion brief：`[challenge-ac4-r4-top-level-expansion-wave-2.md](./challenge-ac4-r4-top-level-expansion-wave-2.md)`
- next expansion ledger：`../../docs/review-plan/runs/2026-04-22-form-api-shape-ac4-r4-top-level-expansion-wave-2.md`
- next pressure test：`AC4.1 field-fact-lane boundary pressure`
- next pressure brief：`[challenge-ac4-r1-field-fact-lane-boundary-pressure.md](./challenge-ac4-r1-field-fact-lane-boundary-pressure.md)`
- next pressure ledger：`../../docs/review-plan/runs/2026-04-22-form-api-shape-ac4-r1-field-fact-lane-boundary-pressure.md`
- next pressure alt：`AC4.3 no-public-companion boundary pressure`
- next pressure alt brief：`[challenge-ac4-r2-no-public-companion-boundary-pressure.md](./challenge-ac4-r2-no-public-companion-boundary-pressure.md)`
- next pressure alt ledger：`../../docs/review-plan/runs/2026-04-22-form-api-shape-ac4-r2-no-public-companion-boundary-pressure.md`
- next pressure wave2：`AC4.4 field-slot-projection boundary pressure`
- next pressure wave2 brief：`[challenge-ac4-r5-field-slot-projection-boundary-pressure.md](./challenge-ac4-r5-field-slot-projection-boundary-pressure.md)`
- next pressure wave2 ledger：`../../docs/review-plan/runs/2026-04-22-form-api-shape-ac4-r5-field-slot-projection-boundary-pressure.md`
- next pressure wave2 result：`AC4.4 rejected`
- current AC4 state：
  - active candidate remains `AC3.3`
  - only parked public challenger is `AC4.1 field-fact-lane`
  - `H007` stays as review overlay, not as public candidate seed
  - rejected challengers are `AC4.2 / AC4.3 / AC4.4`
- required proof：
  - 必须给完整 public contract sketch
  - 必须说明删除了 `AC3.3` 哪些概念
  - 必须复用或解释 `S1 / S2 / C003` 已冻结 law
  - 必须通过 strict-dominance bar
- desired output：一批 `AC4.*` 候选及排序

### C001. Sanctioned Read Route

- target：给 companion 找到一条可用、够小、不会长第二 read family 的读取路径
- brief：`[challenge-s1-sanctioned-read-route.md](./challenge-s1-sanctioned-read-route.md)`
- ledger：`../../docs/review-plan/runs/2026-04-22-form-api-shape-s1-sanctioned-read-route.md`
- status：freeze-recorded
- current freeze：`S1.1 selector-only, helper-deferred sanctioned law`
- active residual：`S1-R1 canonical selector recipe`
- residual brief：`[challenge-s1-r1-selector-recipe.md](./challenge-s1-r1-selector-recipe.md)`
- residual ledger：`../../docs/review-plan/runs/2026-04-22-form-api-shape-s1-r1-selector-recipe.md`
- residual freeze：`S1-R1.1 owner-first slot projection law`
- next residual：`S1-R2 row-heavy owner binding carrier`
- next brief：`[challenge-s1-r2-owner-binding-carrier.md](./challenge-s1-r2-owner-binding-carrier.md)`
- next ledger：`../../docs/review-plan/runs/2026-04-22-form-api-shape-s1-r2-owner-binding-carrier.md`
- next freeze：`S1-R2.1 row-heavy carrier admissibility law`
- followup residual：`S1-R3 diagnostics host-side proof`
- followup brief：`[challenge-s1-r3-diagnostics-proof.md](./challenge-s1-r3-diagnostics-proof.md)`
- followup ledger：`../../docs/review-plan/runs/2026-04-22-form-api-shape-s1-r3-diagnostics-proof.md`
- followup freeze：`S1-R3.1 evidence-envelope host backlink law`
- next exact cut：`S1-R4 exact carrier noun/import shape`
- next exact brief：`[challenge-s1-r4-exact-carrier-noun.md](./challenge-s1-r4-exact-carrier-noun.md)`
- next exact ledger：`../../docs/review-plan/runs/2026-04-22-form-api-shape-s1-r4-exact-carrier-noun.md`
- next exact freeze：`S1-R4.1 exact carrier deferred, byRowId-first reopen bias, no half-freeze`
- required proof：
  - 复杂场景可读
  - 不需要组件 glue
  - 不暴露 `ui` 内部 path
  - 不需要 companion 专属 selector family
- desired output：candidate note 或 no-better verdict

### C000A. Law-First Review Overlay

- target：用 `H007 owner matrix / capability lattice` 持续挑战 owner law、slot admission 与 future lane admission 的判据
- anchor：`[top-level-challenger-inbox.md#h007-owner-matrix--capability-lattice](./top-level-challenger-inbox.md#h007-owner-matrix--capability-lattice)`
- status：review-overlay
- guard：
  - 不进入 public contract 搜索空间
  - 不单独升格为 `candidate-ac4-*`
  - 只作为 future challenger 的 preflight / admission overlay
- desired output：更硬的 review gate，不新增 public noun

### C002. Row-Heavy Proof Pack

- target：用真实复杂列表场景继续挑战 `field-only`
- brief：`[challenge-s2-row-heavy-proof-pack.md](./challenge-s2-row-heavy-proof-pack.md)`
- ledger：`../../docs/review-plan/runs/2026-04-22-form-api-shape-s2-row-heavy-proof-pack.md`
- status：freeze-recorded
- current freeze：`S2.1 no irreducible owner-scope proof`
- next residual：`S2-R1 roster-level soft fact proof`
- next brief：`[challenge-s2-r1-roster-level-soft-fact.md](./challenge-s2-r1-roster-level-soft-fact.md)`
- next ledger：`../../docs/review-plan/runs/2026-04-22-form-api-shape-s2-r1-roster-level-soft-fact.md`
- next freeze：`S2-R1.1 no irreducible roster-level soft fact`
- required proof：
  - reorder / replace / byRowId / nested list
  - cleanup / retention
  - field-local 化是否仍成立
- desired output：proof pack + dominance verdict

### C003. Diagnostics Causal Chain

- target：让 `source -> companion -> rule / submit` 的解释链闭合
- brief：`[challenge-c003-diagnostics-causal-chain.md](./challenge-c003-diagnostics-causal-chain.md)`
- ledger：`../../docs/review-plan/runs/2026-04-22-form-api-shape-c003-diagnostics-causal-chain.md`
- status：freeze-recorded
- current freeze：`C003.1 evidence-envelope derivation-link causal-chain law`
- next exact residual：`C003-R1 exact diagnostics object shape`
- next exact brief：`[challenge-c003-r1-exact-diagnostics-object-shape.md](./challenge-c003-r1-exact-diagnostics-object-shape.md)`
- next exact ledger：`../../docs/review-plan/runs/2026-04-22-form-api-shape-c003-r1-exact-diagnostics-object-shape.md`
- next exact freeze：`C003-R1.1 exact diagnostics object deferred, no second-system shape`
- next proof residual：`C003-R2 bundle-level proof refinement`
- next proof brief：`[challenge-c003-r2-bundle-level-proof-refinement.md](./challenge-c003-r2-bundle-level-proof-refinement.md)`
- next proof ledger：`../../docs/review-plan/runs/2026-04-22-form-api-shape-c003-r2-bundle-level-proof-refinement.md`
- next proof freeze：`C003-R2.1 single-live-bundle-head supersession law`
- next proof exact：`C003-R3 exact evidence shape`
- next proof exact brief：`[challenge-c003-r3-exact-evidence-shape.md](./challenge-c003-r3-exact-evidence-shape.md)`
- next proof exact ledger：`../../docs/review-plan/runs/2026-04-22-form-api-shape-c003-r3-exact-proof-shape.md`
- next proof exact freeze：`C003-R3.1 exact evidence shape deferred, opaque-ref law`
- required proof：
  - 重算原因可解释
  - 清 bundle 可解释
  - submit / blocking 结果可追溯
- desired output：diagnostics-oriented evidence note

### C004. Concrete Spelling

- target：在 frozen scope 下同时审 `companion` noun、`lower` callback 与 baseline sketch，不挑战整体 owner split
- brief：`[challenge-c004-concrete-spelling.md](./challenge-c004-concrete-spelling.md)`
- ledger：`../../docs/review-plan/runs/2026-04-23-form-api-shape-c004-concrete-spelling.md`
- status：freeze-recorded
- current freeze：`C004.1 no strictly better concrete spelling under fixed hard law`
- required proof：
  - challenger 能在不重开 `AC3.3 / P10 / P11 / S1 / S2 / C003` 的前提下，形成 strict-dominance
  - 新 spelling 更易写、更不误导、更不长第二系统
  - 不破坏 `AC3.3` 其余 contract
- desired output：concrete spelling challenger 或 no-better verdict
- child exact carrier taste：
  - brief：`[challenge-c004-r1-exact-carrier-taste.md](./challenge-c004-r1-exact-carrier-taste.md)`
  - ledger：`../../docs/review-plan/runs/2026-04-23-form-api-shape-c004-r1-exact-carrier-taste.md`
  - status：freeze-recorded
  - current freeze：`C004-R1.1 no strictly better exact carrier yet`
  - current ranking：`A > C > B`
  - current residual：`A` 当前仍是 `single-lower atomic-bundle proof`；只有第三 slot 或 per-slot divergence 出现实证，才重开 exact carrier

### C006. Public Lexicon Audit

- target：全量审视当前 authority + `155` 待升格层的 public lexicon 与教学词面
- brief：`[challenge-c006-public-lexicon-audit.md](./challenge-c006-public-lexicon-audit.md)`
- ledger：`../../docs/review-plan/runs/2026-04-23-form-api-shape-c006-public-lexicon-audit.md`
- status：freeze-recorded
- current freeze：`C006.1 no strictly better public lexicon yet`
- keep set：
  - `Form.make / Form.Rule / Form.Error`
  - `field / list / root / submit`
  - `source`
  - `useModule / useSelector`
  - `fieldValue / Form.Error.field`
  - `availability / candidates`
  - `fieldArray / byRowId`
- current scar set：
  - `companion`
  - `lower`
  - `rawFormMeta`
  - teaching gloss layer
- current direction：
  - exact noun 暂不重开
  - 教学 gloss 继续收白
  - `companion` 只按 lane 解释
  - `lower` 只保留 public callback 义项

### C007. Kernel Enabler Audit

- target：审计 `AC3.3` 后续 implementation / evidence 所需的 kernel enabler 与 lowering ownership 残余
- brief：`[challenge-c007-form-api-kernel-descent.md](./challenge-c007-form-api-kernel-descent.md)`
- ledger：`../../docs/review-plan/runs/2026-04-23-form-api-shape-c007-form-api-kernel-descent.md`
- status：freeze-recorded
- current freeze：`C007.1 residual mechanism-only kernel enabler audit`
- current verdict：
  - 不再把 kernel descent 当成顶层目标函数
  - 只审 `already frozen / needed enabler / reopen-gated`
- current residual：
  - 继续只允许 `R0 / R1`
  - 结果必须直接服务 `G1 / G2 / G3 / G4`
  - 不得重开 semantic owner / declaration authority / public noun descent

### C005. `availability` Inflation Guard

- target：持续确认 `availability` 没有变成大兜底
- required proof：
  - 候选 proof 无法归约到 `candidates`、renderer、reason、meta、transaction
  - 必须是 field-owned local fact
- desired output：slot-boundary note

## Challenge Protocol

每一轮新的挑战，统一回答下面五件事：

1. challenge target 是什么
2. 是否给出完整替代 contract
3. 是否存在 strictly better candidate
4. 证据落在哪些 dominance axes
5. 需要回写哪些工件

回写规则固定为：

- 新候选胜出：
  - 新增候选页
  - 更新本页 active candidate
  - 更新 ledger
  - 必要时更新 `spec.md`
- 新候选未胜出：
  - 只记录 evidence、residual、plateau
  - 不改稳定原则

## Parking Lot

下面这些点目前有价值，但优先级低于 `C001 ~ C003`：

- `list/root local-soft-fact lane` 的远期 reopen 条件
- sanctioned read route 是否需要 toolkit bridging note
- `availability.reason` 与 diagnostics reason 的边界
- exact carrier 的教学 framing 压缩
- `AC4.1` 是否还能再压缩成更短的 lexical challenger

## Backlinks

- stable principles / rejections / gates：`[spec.md](./spec.md)`
- current strongest candidate：`[candidate-ac3.3.md](./candidate-ac3.3.md)`
- top-level challenger inbox：`[top-level-challenger-inbox.md](./top-level-challenger-inbox.md)`
- review lineage / latest freeze：`../../docs/review-plan/runs/2026-04-22-form-api-shape-remaining-candidates-review.md`
