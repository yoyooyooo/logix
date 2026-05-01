# Feature Specification: Form API Shape Initial Scheme

**Feature Branch**: `155-form-api-shape`  
**Created**: 2026-04-22  
**Status**: Draft  
**Input**: User description: "把当前已经确定性的 Form API 梳理为一个新的初始方案 spec，并与 150 关联，作为后续多 agent 审视与继续收敛的 owner artifact。重点覆盖：最小 exact surface、删除 fieldValue、field/list/root/source/rule/watch 的职责边界、复杂 toB 动态列表与跨行互斥场景、source 与 watch 的协调层、开放问题记录。"

## North Stars & Kill Features Traceability _(optional)_

- **North Stars (NS)**: NS-3, NS-4, NS-10
- **Kill Features (KF)**: KF-3, KF-8, KF-9

## Current Role

- 本页只承接 `155` 的稳定原则、负边界、promotion gate 与 challenge workflow。
- 本页不承接完整候选 contract，当前最强候选单独落在 `candidate-ac3.3.md`。
- 本页不替代现行 authority，例如 `docs/ssot/form/13-exact-surface-contract.md`、`docs/ssot/runtime/10-react-host-projection-boundary.md`。
- 本页不允许把 proposal page 用成 shadow authority。

## Artifact Topology

`155` 当前拆成多类工件：

- `spec.md`
  - owner：稳定原则、拒绝方向、promotion gate、challenge workflow
  - 目标：给后续挑战提供统一口径
- `discussion.md`
  - owner：active challenge queue、候选 lineage、reopen evidence inbox
  - 目标：承接下一轮挑战，不代持原则
- `candidate-ac3.3.md`
  - owner：当前最强候选 `AC3.3 companion-residual-closed`
  - 目标：集中叙述 contract、例子、reduction law、runtime invariants、未补证据
- `scenario-proof-family.md`
  - owner：`06` 场景矩阵的 `WF* / W*` 投影视图
  - 目标：按 `docs/ssot/form/06` 的 `SC-*` 主矩阵解释长期压测 family、executable subset 与 benchmark whitelist
- `signoff-brief.md`
  - owner：面向拍板的上层 API 形状综述
  - 目标：把当前 authority、`155` 待升格形状与 defer 点压成单文档
- `docs/review-plan/runs/2026-04-22-form-api-shape-remaining-candidates-review.md`
  - owner：当前一轮 remaining-candidates review、freeze record、reopen surface 收口
  - 目标：保留 lineage 与 round-by-round facts
- `top-level-challenger-inbox.md`
  - owner：未升格顶层方向雷达
  - 目标：持续识别新方向，并把失败方向反哺成 `AC3.3` 的 guardrail / negative evidence / reopen trigger

## Imported Context

当前 Form 的长期语义收口已经拆到 `149 / 150 / 151 / 152 / 153 / 154`：

- `149`：row roster projection theorem
- `150`：owner artifact / working artifact governance
- `151`：active set / cleanup
- `152`：settlement contributor
- `153`：reason / evidence
- `154`：Query-owned Resource × Form boundary

`155` 当前只回答三类问题：

- 哪些原则已经稳定
- 哪些方向已经被拒绝
- 后续若要挑战 `AC3.3`，证据与 workflow 应怎么组织

这些历史语义已按 invariant、gate、negative guard、proof obligation 的形态吸收到本页、`candidate-ac3.3.md` 与相关 challenge briefs，不再保留独立 carryover proposal。

场景矩阵唯一事实源统一看 [../../docs/ssot/form/06-capability-scenario-api-support-map.md](../../docs/ssot/form/06-capability-scenario-api-support-map.md)。`scenario-proof-family.md` 只保留 `06` 派生的 `WF* / W*` 投影视图。

## Absorbed Historical Constraints

### H1. `149` Row Identity

- 公开 row truth 继续只认 canonical row identity
- `byRowId / trackBy / rowIdStore / render key` 必须继续回链同一条 row truth
- synthetic local id 不得回流成公开真相
- index fallback 只算 residue 或 proof failure

### H2. `150` Governance

- 单一 owner artifact 与 working artifact 继续分离
- registry / checklist 只做派生入口，不反向定义 authority
- discussion 继续只承接 working material
- shadow authority 继续拒绝

### H3. `151` Active Set And Cleanup

- active exit 必须保持单一 contract
- subtree active exit 时，`errors / ui / pending / blocking` 一起退出
- active exit 后允许保留的残留只剩 cleanup receipt
- `replace(nextItems)` 继续按 roster replacement 解释
- presence policy 必须显式

### H4. `152` Settlement

- async contributor 继续是 `field / list.item / list.list / root` 的一等声明
- contributor grammar 至少保留 `deps / key / concurrency / debounce / submitImpact`
- `submitImpact` day-one 继续偏向 `block | observe`
- `minItems / maxItems` 继续是 canonical list cardinality basis
- pending / stale / blocking 必须落在同一 submit truth

### H5. `153` Reason And Evidence

- 同一 path explain 必须能解释 `error / pending / cleanup / stale`
- `reasonSlotId.subjectRef` day-one 继续只允许 `row / task / cleanup`
- canonical evidence envelope 继续喂给 `UI / Agent / trial / compare / repair`
- materialized report 只能是 on-demand subordinate view
- 第二 issue tree、第二 explain object、第二 compare/report truth 继续拒绝

### H6. `154` Source Boundary

- Query 继续持有 `Resource / load / remote fact`
- Form 继续通过 `field(path).source({ resource, deps, key, ... })` 消费 Query-owned capability
- `rule / submit / UI` 只消费 source receipt，不直接做 IO
- React host 不长第二条 remote sync path
- `target / scope / slot / reset` 一类第二声明体系继续拒绝

## Stable Principles

### P1. Single Remote Truth

- `source` 继续只承接 Query-owned remote fact。
- Form 不定义第二 remote protocol。
- `rule / submit / UI` 只消费 source receipt，不直接做 IO。
- React host 继续只消费 projection。

### P2. Canonical Read Route Target

- 未来 canonical read route 继续朝 `useModule + useSelector(handle, selectorFn)` 收口。
- row-heavy 读侧继续保持 `rowId-first` 偏置。
- synthetic local id 与 index teaching 不得回流成公开真相。
- `fieldValue(path)` 当前仍只算 reopen target，不视为已执行 cut。
- 若未来需要 sanctioned local-soft-fact read route 的 exact cut，必须单独重开 authority。

### P3. Owner Split

- `source` 承接 remote fact ingress。
- `local-soft-fact lane` 承接 field-owned local-soft-fact lane；exact spelling 只在 active candidate 页冻结。
- `rule` 承接 sync/effect contributor 与 settlement truth。
- `submit` 承接 submit truth。
- async contributor 继续沿 `field / list.item / list.list / root` 的单一 grammar 收口。
- pending / stale / blocking 继续落在同一 submit truth。
- React host 只做 projection 与渲染映射。

### P4. Local-Soft-Fact Minimality

- 若本地协调能力进入公开面，必须 owner-attached。
- day-one 稳定 law 只允许 `field-only`。
- 当前 active candidate 由 [candidate-ac3.3.md](./candidate-ac3.3.md) 叙述为 `field(path).companion(...)`；spelling 不在本页冻结。
- `list()`、`root()` 级 local-soft-fact lane 只有在 irreducible proof 出现后才允许重开。
- slot inventory 默认保持最小，不能靠 registry、selector family 或 merge rule 扩张。

### P5. No Second System

- 组件侧 glue 不能成为 canonical owner。
- local-soft-fact lane 不能吸收 IO。
- local-soft-fact lane 不能写 `values / errors / submit truth`。
- local-soft-fact lane 不能顺手长出第二 read family、第二 projection family、第二 diagnostics truth。
- 不允许第二 pending / blocker / verdict system。
- 不允许第二 issue tree / explain object / report truth。

### P6. Strict-Dominance Review Rule

- 任何新候选都必须在 `concept-count / public-surface / compat-budget / migration-cost / proof-strength / future-headroom` 上给出严格改进证据。
- `runtime clarity` 继续只作 supporting note，不再单独充当固定 dominance axis。
- 只提出批评不够，必须给出完整替代 contract，或明确 `no strictly better candidate`。

### P7. North Star Is Single Evidence-Backlinked Lane

`155` 后续所有候选都不得把“成熟生态里已有更多零件”当作主要胜负标准。

本 spec 的主竞争口径固定为：

- 在 `06` 的 `SC-*` 主矩阵与派生 `WF1 .. WF6` 上维持一条 `owner-attached local-soft-fact lane`
- 让 authoring、selector read、diagnostics、trial / compare 共用同一 truth 与同一 evidence envelope
- `less-system-split` 继续只算 dominance proxy，不再单独充当最高目标函数
- 减少组件 / query / form / host 之间的业务 glue
- 减少第二真相、第二 read law、第二 diagnostics truth
- 提高 owner clarity 与 evidence explainability

若一个候选只是补更多零件，或者只是更接近 Vue / Angular / TanStack Form 等生态的表面能力，但不能强化这条 lane，默认不算主线改进。

### P8. API Must Preserve Optimization Headroom

`155` 不要求在 API 设计阶段同时证明最终内核性能。

但任何候选都必须先通过优化空间门：

- 不得锁死后续 hot path 收缩
- 不得阻碍 trace / benchmark / diagnostics 证据采集
- 不得把未来性能优化逼成第二系统或兼容层
- 不得让真实实现只能靠组件 glue 或 hidden internal lane 补性能

性能最终必须由真实可运行逻辑、trace 与 benchmark 证明。API 设计阶段只冻结不会明显堵死优化路线的边界。

### P9. Agent-First Contract Layering

`155` 默认优先冻结 hard law，不主动把推荐写法、命名偏好、共置方式升成硬 API。

- 会影响单一 truth、单一 read law、单一 diagnostics truth、control-plane mechanical backlink 的内容，才应进入 hard law
- 默认 authoring 顺序、复杂 proof 的推荐组合、实施波次、常见 toB recipe，优先留给 recipe / skill / workflow
- spelling、helper、共置壳层、exact helper family，默认只算 sugar；除非它们已经成为 control-plane、diagnostics 或 single-truth 的必要前提
- future challenger 必须先说明自己挑战的是 `hard law / soft recipe / optional sugar` 哪一层，禁止拿 recipe/sugar 偏好直接要求顶层 reopen

### P9.5. Agent-First Also Means Human-Readable

`155` 继续消费 repo 级 API 命名原则：

- Agent-first 的默认成功标准，同时包含 Agent 生成稳定性与人类首读可理解性
- public API noun 若长期无法用低心智语言稳定解释，按 design debt 处理
- 一个公开 noun 只允许一个主角色
- 内部精确术语不得压过用户文档主叙事

所以 `155` 后续对 API 词面的默认判断标准也固定为：

- 能否被稳定生成
- 能否被稳定讲白
- 能否避免同词多义与解释层串线

### P10. Carrier-Neutral Atomic Bundle Law

在 local-soft-fact lane 上，`155` 现在只冻结 carrier-neutral 的语义，不冻结 exact authoring carrier。

- hard law 只冻结：
  - 单 owner
  - 单 frame
  - 单 input authority：`value / deps / source?`
  - 单语义结果：`clear` 或 `bundle`
  - 单次 owner-local atomic bundle commit
  - 单 evidence envelope
- `clear` 属于语义层，不代表某个 JS 编码 authority；`undefined => clear` 只算当前 baseline recipe
- `monolithic object return`、slot-local resolver、emitter、builder-style shape 都只算 future carrier 候选
- 若某个候选会引入 per-slot deps、partial merge、第二 patch family、第二 diagnostics grain、第二 read family，就不再属于 admissible carrier
- exact carrier 继续 deferred；只有出现严格支配证据，才允许从 carrier principle 下钻到 exact shape

### P11. Single Host Gate And Read-Input Taxonomy

在 read side，`155` 现在冻结一条单主路原则：

- canonical host gate 只认 `useModule + useSelector(handle, selector, equalityFn?)`
- 任何 exported read noun 都只允许作为 selector helper 被消费，不能被描述成平权 canonical read route
- teaching lane 固定为：
  - 先 resolve owner
  - 再投影 sanctioned truth
  - row-heavy 场景继续走 `rowId-first`
  - explainability 继续回到同一 evidence envelope
- `fieldValue(path)` 继续只算 core-owned adjunct convenience，且仍是 reopen target，不承接 companion / local-soft-fact read
- `rawFormMeta()` 继续只算 core-owned raw trunk adjunct，未来 strict derivation 若重开，只允许挂在这里
- `Form.Error.field(path)` 继续保留，但身份固定为 form-owned selector primitive / explain-support primitive
- row-heavy owner binding 当前只能服务 selector 重入，不能获得独立 read family 身份
- exact row-heavy read carrier 继续 deferred；`byRowId-first` 继续只算 reopen bias

## Stable Rejections

下面这些方向已经稳定拒绝，后续除非出现严格支配证据，否则不再回到主搜索空间：

- generic `watch / computed` public family
- 把本地协调塞进 `source`
- 组件侧 `selector / useEffect` 作为 canonical glue
- `choices / candidates / options / lookup` 充当总骨架
- `interaction` 作为 Form public noun
- `field/list/root` 全开 local-soft-fact family
- slot registry、slot selector family、多次 local-soft-fact merge
- 现在就冻结 exact `ui` path encoding
- 在没有 reduction failure 之前放行第三个 top-level slot

## Current Candidate State

- active candidate：`specs/155-form-api-shape/candidate-ac3.3.md`
- implementation baseline：`AC3.3`
- current verdict：`AC3.3 companion-residual-closed`
- current status：当前最强平台，已通过 round `19` plateau check
- current limitation：还未进入 exact authority
- current subchallenge progress：
  - `AC4` 顶层扫描与 challenger compare 已完成，未发现严格支配 `AC3.3` 的主候选
  - `AC4.1 field-fact-lane` 当前保留为 parked lexical challenger
  - `H007 owner matrix / capability lattice` 当前保留为 review overlay，不进入 public contract 搜索空间
  - `S1 / S2 / C003 / TRACE` 的 freeze 细目统一留在 `discussion.md` 与 latest ledger
  - 当前主线程已切到 implementation + evidence
  - 当前剩余缺口是 actual code / empirical evidence；`AC4.1` 只保留为 spelling-level counterfactual

当前不升 authority 的核心原因已经收敛到三条：

- sanctioned local-soft-fact read route 还没补证据
- row-heavy proof bundle 还没补证据
- diagnostics causal chain 还没补证据

## Promotion Gates

### G1. Read Route Evidence

必须证明：

- 复杂 local-soft-fact 场景可以沿 canonical selector route 稳定读取
- 不需要组件 glue
- 不需要第二 selector family
- 不泄露 `ui` 内部 path

当前 `S1` 已收平到：

- route law 已冻结
- selector recipe 已冻结到 owner-first / slot-only / rowId-first law
- row-heavy carrier 已冻结到 admissibility law
- diagnostics proof 已冻结到 evidence-envelope host backlink law
- exact carrier 继续 deferred，但 reopen bias 已收敛到 `byRowId-first`
- exact helper / exact path / exact token 继续 deferred
- diagnostics exact object 继续 deferred，且 no-better verdict 已冻结
- 后续主要缺口是 bundle-level proof 细化

### G2. Row-Heavy Proof Evidence

必须证明：

- reorder / replace / byRowId / nested list 场景下 field-local soft-fact lifecycle 可解释
- cleanup / retention 与 row identity 一致
- 复杂列表 proof 不会逼出 day-one `list/root local-soft-fact lane`

当前 `S2` 已收平到：

- 现有 row-heavy proof 仍不足以证明必须重开 `list/root local-soft-fact lane`
- 当前表现为 proof strength 不足，未构成 owner scope 失配
- roster-level soft fact proof 已经再次压测，当前仍没有不可分解 proof
- canonical row identity、roster replacement、cleanup receipt only residue 继续作为 imported guard
- 长期 ToB 压测母集统一看 `docs/ssot/form/06-capability-scenario-api-support-map.md` 的 `SC-*` 主矩阵，`scenario-proof-family.md` 只作 `WF* / W*` 投影视图
- 后续若要重开，必须给出无法归 source / rule / settlement / reason / list DSL / host projection 的稳定 list/root 级 soft slice

### G3. Diagnostics Evidence

必须证明：

- `source receipt -> local-soft-fact lower -> rule / submit outcome` 的因果链可解释
- local-soft-fact bundle 的重算、清 bundle、patch 能稳定定位
- 不会长出第二 diagnostics truth

当前 `C003` 已收平到：

- diagnostics causal chain law 已冻结到 `sourceReceiptRef? -> derivationReceiptRef -> bundlePatchRef -> reasonSlotId`
- diagnostics truth 继续停在同一个 evidence envelope 内
- bundle-level proof 已冻结到 `single-live-bundle-head supersession law`
- exact diagnostics object 与 exact evidence shape 均继续 deferred，且 no-better verdict 已冻结
- `causal-links` summary law 已冻结
- `reasonSlotId.subjectRef` day-one 继续只允许 `row / task / cleanup`
- materialized report 继续只允许 subordinate view
- 后续主要缺口是实现期 trace substrate

### G4. Implementation Trace Evidence

必须证明：

- `runtime.trial(mode="scenario")` 能承载 local-soft-fact causal-chain proof
- `runtime.compare` 能产出 `declarationDigest / scenarioPlanDigest / evidenceSummaryDigest`
- row-heavy proof、clear / retire、rule / submit backlink 能形成统一 `causal-links` evidence

当前 `TRACE` 已收平到：

- 方向是对的，但当前 `not-ready`
- contract layer 已冻结为：`TRACE-S1 -> TRACE-S2 -> TRACE-S3 -> TRACE-S4 -> TRACE-S5`
- `TRACE-S1 / TRACE-S2 / TRACE-S3 / TRACE-S4 / TRACE-S5` 不再重开
- benchmark evidence 后置于 implementation proof 闭环之后，因为 benchmark 只允许复用 execution carrier
- implementation proof 已冻结到 `TRACE-I1`
- benchmark evidence 已冻结到 `TRACE-I2`
- 当前 active gap 是 actual code / empirical evidence
- 这批 empirical evidence 当前统一回链 `docs/ssot/form/06-capability-scenario-api-support-map.md` 的 `SC-*` 主矩阵

### Secondary Challenge Slots

下面两项值得继续打磨，但当前不构成 authority promotion blocker：

- `C004` 已冻结为 `no strictly better concrete spelling under fixed hard law`
- `availability` 的边界是否足够瘦，能否长期防止语义发胖

## Allowed Reopen Surface

下面四类事实是当前唯一允许的顶层 reopen surface：

1. sanctioned read route 失败，现有 selector-only 路线无法承接 local-soft-fact 读取，且会暴露内部 path
2. 出现无法 field-local 化的 `list/root` 级 soft slice，且无法稳定路由到 `source / rule / settlement / reason / list DSL / host projection`
3. `availability / candidates` 归约失败，或 per-slot deps/source divergence 已出现可测的性能代价或诊断代价
4. 某个 spelling-level challenger 能在 `06` 的同一组 `SC-*` 与派生 `WF1 .. WF6` 上删除一层公开翻译，同时在 owner law / read law / diagnostics law 三线强于 `AC3.3`，且不引入第二 authority、第二 workflow、第二 diagnostics truth

当前 reopen 一律按实施口径解释。命名偏好、词面直觉、抽象趣味都不构成 reopen 证据。

## Future Challenge Workflow

后续若要继续挑战 `AC3.3`，固定使用下面的流程：

1. 先判断是否进入 `top-level-challenger-inbox.md`
   - 未成型的新方向先作为 `H*` 种子进入 inbox
   - 只有通过 preflight gate 才升格为正式 `candidate-ac4-*.md`
2. 再在 `discussion.md` 建立 challenge entry
   - 写明 target、假设、需要的 proof、预期产物
3. 若提出新候选，必须新增独立候选页
   - 例如 `candidate-ac3.4.md`
   - 不在 `spec.md` 内直接堆完整 contract
4. 每轮评估都必须回答两件事
   - 是否存在 strictly better candidate
   - 若不存在，当前 residual 是什么
5. 若新候选胜出，统一做四件回写
   - 更新 `discussion.md` 的 active candidate
   - 在 ledger 追加 round 记录
   - 在 `spec.md` 更新 candidate state / promotion gate
   - 保留旧候选文档，作为历史基线
6. 若本轮无更优候选
   - 只追加 evidence、residual risk、plateau note
   - 不改稳定原则
7. 若方向失败但有价值
   - 回写 `top-level-challenger-inbox.md` 的 `feedback to AC3.3`
   - 不新增正式 candidate

## Secondary Backlog

当前建议继续观察但不进入顶层 reopen gate 的 backlog：

- `S4` `lower` callback spelling
- `S5` `availability` slot inflation guard

## Imported Authority _(recommended)_

- [../../specs/150-form-semantic-closure-group/spec.md](../../specs/150-form-semantic-closure-group/spec.md)
- [../../specs/149-list-row-identity-public-projection/spec.md](../../specs/149-list-row-identity-public-projection/spec.md)
- [../../specs/151-form-active-set-cleanup/spec.md](../../specs/151-form-active-set-cleanup/spec.md)
- [../../specs/152-form-settlement-contributor/spec.md](../../specs/152-form-settlement-contributor/spec.md)
- [../../specs/153-form-reason-projection/spec.md](../../specs/153-form-reason-projection/spec.md)
- [../../specs/154-form-resource-source-boundary/spec.md](../../specs/154-form-resource-source-boundary/spec.md)
- [../../docs/ssot/form/05-public-api-families.md](../../docs/ssot/form/05-public-api-families.md)
- [../../docs/ssot/form/13-exact-surface-contract.md](../../docs/ssot/form/13-exact-surface-contract.md)
- [../../docs/ssot/runtime/10-react-host-projection-boundary.md](../../docs/ssot/runtime/10-react-host-projection-boundary.md)

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: `155/spec.md` MUST remain a principle / boundary / workflow artifact and MUST NOT hold the full active candidate contract.
- **FR-002**: The active strongest candidate MUST live in a standalone candidate page under `specs/155-form-api-shape/`.
- **FR-003**: The proposal MUST preserve the owner split `source / local-soft-fact lane / rule / submit / host` until a strictly better split is proven.
- **FR-004**: The proposal MUST preserve the rejection of generic `watch / computed`, `source` mix-layering, component-side canonical glue, and slot-family expansion unless a challenger passes strict-dominance review.
- **FR-005**: Any future challenger MUST provide a full replacement contract or an explicit `no strictly better candidate` verdict.
- **FR-006**: `discussion.md` MUST stay a working artifact for challenge queue, lineage, and reopen evidence, and MUST NOT overrule `spec.md`.
- **FR-007**: Any future challenger MUST be evaluated against the single evidence-backlinked local-soft-fact lane target, with `less-system-split` only as a dominance proxy, not against broad ecosystem parity or feature-count parity.
- **FR-008**: Any future challenger MUST preserve optimization headroom for runtime implementation, trace evidence, and benchmark-driven iteration.

### Non-Functional Requirements

- **NFR-001**: `155` MUST avoid shadow authority by keeping candidate narrative and stable principles on separate pages.
- **NFR-002**: The challenge workflow MUST preserve historical lineage instead of overwriting old baselines.
- **NFR-003**: The spec MUST make the promotion blockers and secondary challenge slots immediately visible to future reviewers.
- **NFR-004**: Any future document split or evolution MUST reduce ambiguity rather than increase concept-count.
- **NFR-005**: API shape decisions MUST NOT claim performance victory without executable evidence; they MAY only reject directions that visibly block future optimization or diagnostics evidence.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A reviewer can identify `155`'s stable principles, stable rejections, and active candidate path within one read.
- **SC-002**: A reviewer can explain why `AC3.3` is current strongest yet still not authority.
- **SC-003**: A future challenger can start a new round by following `Challenge Slots` plus `Future Challenge Workflow` without re-reading the full chat history.
- **SC-004**: No `155` page by itself can be mistaken for an already-promoted exact authority contract.
