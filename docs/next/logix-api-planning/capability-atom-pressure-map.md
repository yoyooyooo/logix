---
title: Capability Atom Pressure Map
status: active
version: 26
---

# Capability Atom Pressure Map

## 目标

从当前 `CAP-01..CAP-26 / VOB-01..VOB-03` 中挑出高风险、高价值、可能逼出新 API 或内部边界变化的原子能力，形成第二轮 adversarial pressure queue。

本页不重开 frozen API shape，不冻结 exact surface。它只定义后续要优先挑战哪些能力点、挑战什么、什么证据足以触发 `COL-* / PRIN-* / authority writeback / implementation task`。

## Source

- [../../ssot/capability/03-frozen-api-shape.md](../../ssot/capability/03-frozen-api-shape.md)
- [../../ssot/form/08-capability-decomposition-api-planning-harness.md](../../ssot/form/08-capability-decomposition-api-planning-harness.md)
- [../../ssot/form/06-capability-scenario-api-support-map.md](../../ssot/form/06-capability-scenario-api-support-map.md)
- [frozen-api-shape-risk-lanes.md](./frozen-api-shape-risk-lanes.md)
- [risk-lane-closure-check.md](./risk-lane-closure-check.md)
- [post-conv-implementation-task-queue.md](./post-conv-implementation-task-queue.md)
- [cap-press-007-fu1-selector-type-safety-ceiling.md](./cap-press-007-fu1-selector-type-safety-ceiling.md)
- [cap-press-007-fu2-typed-path-metadata-chain.md](./cap-press-007-fu2-typed-path-metadata-chain.md)
- [auth-review-companion-metadata-carrier.md](./auth-review-companion-metadata-carrier.md)
- [human-press-001-first-read-acceptance-taste-pressure-packet.md](./human-press-001-first-read-acceptance-taste-pressure-packet.md)
- [human-press-001-fu1-docs-teaching-follow-up.md](./human-press-001-fu1-docs-teaching-follow-up.md)
- [agent-press-001-medium-model-agent-first-pressure-packet.md](./agent-press-001-medium-model-agent-first-pressure-packet.md)

## Pressure Rules

- 默认以挑战 frozen shape 为目标，但不能只靠偏好重开 surface。
- A 级或高风险 pressure 默认走 adversarial pressure，不允许只做 frozen shape 回归验证。
- 每个高风险 pressure slice 必须组合多个互相拉扯的 capability，优先覆盖三个以上 `CAP-* / VOB-*`。
- 每个高风险 pressure slice 必须至少施压两个 owner / truth lane，例如 source、submit、row、selector、evidence、verification、report、host。
- 每个高风险 pressure slice 必须生成至少两个可行 counter-shape，并记录淘汰或采纳理由；若无法生成，必须说明原因并交给 review lane 攻击。
- no-public-change 结论必须承担 status quo burden，证明现有 API 的组合写法可读、可生成、内部无隐藏第二 truth、proof 覆盖组合 proof sample。
- 文档推理不足时，必须进入 implementation friction experiment，不能靠偏好裁决。
- 新 public concept 只有通过 concept admission gate 后才能进入 surface candidate registry。
- 每个 pressure slice 必须说明它挑战的 `CAP-* / VOB-* / PROJ-* / IE-* / PF-*`。
- 若挑战结果只暴露实现缺口，进入 implementation task queue。
- 若挑战结果说明当前 API lane 无法组合覆盖，打开 `COL-*` 或 authority writeback request。
- 若挑战结果反复出现同一底层规律，进入 `PRIN-*` promotion lane。
- 若挑战结果只说明示例或命名不清晰，优先回 exact authority 或 docs，不新增公开概念。
- `TASK-003` root compare productization 仍需显式 authority intake，不能被本页 generic pressure 自动启动。

## Risk Scoring

| grade | meaning | reopen implication |
| --- | --- | --- |
| `A` | 高风险，高价值，失败后可能逼出新 public API、owner law 或内部 substrate 边界 | 优先开 pressure packet |
| `B` | 重要能力，当前形状大概率可覆盖，但边界细节仍值得打磨 | 排在 A 后，通常先补 proof 或 internal law |
| `C` | 基础能力或已高度稳定，主要防回归 | watch only |

Scoring signals:

- `implementation_status=partial` 或 `proof_status=partial`
- 横跨两个以上 owner lane
- 牵涉 final truth、evidence truth、host truth、verification truth
- 失败会导致第二 public family、第二 evidence envelope、第二 report object 或第二 read route
- 已在多个 `COL-* / RISK-* / TASK-*` 中重复出现
- 对 Agent first-read 或生成稳定性有明显影响

## Atom Shortlist

| atom | grade | why high pressure | current frozen owner | challenge target |
| --- | --- | --- | --- | --- |
| `CAP-06` source dependency scheduling | `A` | `IE-02` 仍 partial；`deps / key / concurrency / debounce` 若表达不足，会逼出 source policy API | `field(path).source(...)` | 是否需要更明确的 scheduling policy 或 internal source task identity law |
| `CAP-07` source task lifecycle | `A` | pending/stale/error 若无法稳定解释，会长出第二 settlement 或 source state family | `field(path).source(...)` + submit/evidence lane | lifecycle 是否只靠 source receipt 与 submitImpact 足够 |
| `CAP-08` source submit impact | `A` | source 与 submit truth 边界最容易混淆 | `submitImpact` | `block / observe` 等策略是否足以表达 submit 影响 |
| `CAP-09` source receipt identity | `A` | 连接 source、rule、submit、diagnostics；当前实现与 proof 仍 partial | evidence substrate | receipt identity 是否需要更稳定的 internal coordinate 或 selector-level exposure |
| `CAP-15` rule submit backlink | `A` | final truth 与 evidence 回链的核心铰链 | rule / submit / reason lane | reasonSlotId 与 submit summary 是否足以解释 row/root/source 组合 |
| `CAP-16` async settlement contributor | `A` | async rule 与 source lifecycle 可能逼出统一 settlement grammar | settlement lane | 当前 rule/source/submit 组合是否隐藏了第二 task grammar |
| `CAP-18` evidence causal link | `A` | 牵涉 source、companion、rule、submit、trial、compare | evidence envelope | evidence links 是否能保持单 envelope 且可机械回放 |
| `CAP-21` byRowId owner route | `A` | 同时压 write route 与 host selector read route | row identity + host selector | byRowId 写读对称是否足够，是否需要更强 path/owner primitive |
| `CAP-23` nested owner remap | `A` | nested list 可能打穿当前 row owner chain | active-shape lane | nested owner 是否可在不新增 list/root companion 的前提下稳定 remap |
| `VOB-01` scenario trial carrier | `A` | `fixtures/env + steps + expect` 可能逼出 exact scenario API 与 compiled plan law | runtime verification | scenario input protocol 是否足够小且可验证 |
| `VOB-02` compare / perf admissibility | `A-blocked` | root compare productization 风险大，但当前只能 authority intake | runtime verification | 仅在显式请求 productization 时启动 |
| `VOB-03` report materializer | `A` | report 若解释力不足，会逼出第二 report object 或 summary law | `VerificationControlPlaneReport` | report 是否能只读 canonical truth 与 evidence summary |
| `CAP-10` local companion derivation | `B` | 最小生成元强，但可能被复杂 soft fact 压成更通用 fact lane | `field(path).companion(...)` | `lower(ctx)` 是否过窄或过宽 |
| `CAP-12` candidate set soft fact | `B` | candidate 很容易被误读为 remote options API | companion lane | local candidates 与 source options 的边界是否足够清楚 |
| `CAP-13` companion selector admissibility | `B` | host selector 与 companion projection 交界 | host selector gate | selector primitive 是否让 raw landing path 永久隐藏 |
| `CAP-14` cross-row final constraint | `B` | 当前 proof proven，但实现仍 partial | rule/list lane | cross-row final truth 是否只靠 list/root rule 足够 |
| `CAP-17` reason slot identity | `B` | 影响 UI、Agent、trial、report | reason lane | 单 reasonSlotId 是否能承接 error/pending/stale/cleanup |
| `CAP-19` list row identity chain | `B` | row identity 是多个高风险能力依赖项 | active-shape lane | canonical row id chain 是否过度内部化 |
| `CAP-20` structural edit continuity | `B` | reorder/swap/move/replace/remove 组合复杂 | active-shape lane | operation semantics 是否需要更强 transaction boundary |
| `CAP-22` active exit cleanup | `B` | cleanup 与 reason evidence 连接复杂 | cleanup lane | stale contribution 退出是否需要独立 cleanup API |
| `CAP-24` host acquisition | `B` | host law 稳定，但 wrapper pressure 长期存在 | React host route | acquisition route 是否足够 Agent-first |
| `CAP-25` selector read route | `B` | single selector gate 是当前形状的强约束 | React host route | strict selector gate 是否伤害首读与生成稳定性 |
| `CAP-26` selector helper adjunct taxonomy | `B` | helper 很容易膨胀成第二 authority | helper adjunct | helper 分类是否需要更硬的 negative law |
| `CAP-01..04` declaration / base submit | `C` | 主链稳定，当前只需防止 second carrier 与 decode noun 回流 | declaration / submit lane | watch only |

## Pressure Slice Queue

| slice id | status | grade | target atoms | challenge question | possible output |
| --- | --- | --- | --- | --- | --- |
| `CAP-PRESS-001` | `closed-current-matrix` | `A` | `CAP-06`, `CAP-07`, `CAP-08`, `CAP-09`, `CAP-18` | `field(path).source(...)` 是否足以表达 freshness、lifecycle、submitImpact 与 receipt identity | [cap-press-001-source-freshness-lifecycle-receipt-pressure-packet.md](./cap-press-001-source-freshness-lifecycle-receipt-pressure-packet.md) |
| `CAP-PRESS-002` | `closed-current-matrix` | `A` | `CAP-03`, `CAP-14`, `CAP-15`, `CAP-16`, `CAP-17`, `CAP-18` | final truth、async settlement、submit snapshot 与 reason backlink 是否仍能共用 rule / submit / evidence lane | [cap-press-002-final-truth-settlement-reason-pressure-packet.md](./cap-press-002-final-truth-settlement-reason-pressure-packet.md); `TASK-008` closed |
| `CAP-PRESS-003` | `closed-current-matrix` | `A` | `CAP-19`, `CAP-20`, `CAP-21`, `CAP-22`, `CAP-23`, `CAP-13`, `CAP-25` | row owner chain 在 nested / reorder / cleanup / read-write symmetry 下是否逼出新的 owner primitive | [cap-press-003-row-owner-nested-remap-pressure-packet.md](./cap-press-003-row-owner-nested-remap-pressure-packet.md); [cap-press-003-fu1-real-runtime-row-owner-proof.md](./cap-press-003-fu1-real-runtime-row-owner-proof.md) closed retained harness without public API change |
| `CAP-PRESS-004` | `closed-current-matrix` | `B` | `CAP-10`, `CAP-11`, `CAP-12`, `CAP-13`, pressure from `CAP-14`, `CAP-19..23`, `CAP-25` | `companion` 作为 soft fact 最小生成元是否过窄、过宽或需要改名 | [cap-press-004-companion-soft-fact-boundary-pressure-packet.md](./cap-press-004-companion-soft-fact-boundary-pressure-packet.md) closed no-change proof without public fact/list/root/final-truth/read-family change |
| `CAP-PRESS-005` | `closed-current-matrix` | `A` | `VOB-01`, `VOB-03`, `CAP-15`, `CAP-17`, `CAP-18`, `CAP-23`, overlay `CAP-25`, adjacent blocked `VOB-02` | `fixtures/env + steps + expect` 与 `VerificationControlPlaneReport` 是否足以支撑 scenario trial 与 report materialization | [cap-press-005-verification-scenario-report-pressure-packet.md](./cap-press-005-verification-scenario-report-pressure-packet.md) closed no-change proof without public scenario carrier, second report object, raw evidence compare, receipt coordinate expansion, expectation truth owner, or root compare productization |
| `CAP-PRESS-006` | `blocked-authority` | `A-blocked` | `VOB-02`, `CAP-18`, `CAP-25` | `runtime.compare` 是否需要从 control-plane stage 变成 productized root route | only explicit `TASK-003` authority intake |
| `CAP-PRESS-007` | `closed-current-matrix` | `B` | `CAP-24`, `CAP-25`, `CAP-26`, `CAP-13`, `CAP-21` | single host selector gate 是否过紧，是否需要 toolkit-level wrapper 与 canonical route 分层；selector type-safety ceiling 是否要求 sealed union / typed path / declaration metadata 单链闭合 | [cap-press-007-fu1-selector-type-safety-ceiling.md](./cap-press-007-fu1-selector-type-safety-ceiling.md) closed host gate pressure; [cap-press-007-fu2-typed-path-metadata-chain.md](./cap-press-007-fu2-typed-path-metadata-chain.md) pressure closed; `TASK-009` closes `fieldValue` typed path and returned-carrier companion exact typing; imperative void callback stays honest-unknown |
| `CAP-PRESS-008` | `watch` | `C` | `CAP-01`, `CAP-02`, `CAP-03`, `CAP-04` | declaration root 与 submit decode 是否仍能防止 second carrier / decode noun | watch only unless new scenario hits declaration spine |
| `HUMAN-PRESS-001` | `closed-human-burden-met` | `taste` | `CAP-10..13`, `CAP-19..26`, overlay `CAP-14`, `CAP-17`, `CAP-18` | human first-read、接受阻力与 API taste 是否逼出 public path、Form hook、row token、list/root companion、generic fact、carrier selector 或 void callback auto-collection | [human-press-001-first-read-acceptance-taste-pressure-packet.md](./human-press-001-first-read-acceptance-taste-pressure-packet.md) closed as `no-change-human-burden-met`; [human-press-001-fu1-docs-teaching-follow-up.md](./human-press-001-fu1-docs-teaching-follow-up.md) consumed docs task; no public concept admitted |
| `AGENT-PRESS-001` | `closed-docs-risk` | `agent-first` | `CAP-01..CAP-26`, `VOB-01..VOB-03` | GPT-5.5 medium 级别的生成模型是否会在 frozen shape 下稳定选择 owner lane、host read gate 与 verification control-plane，而不发明 public concept | [agent-press-001-medium-model-agent-first-pressure-packet.md](./agent-press-001-medium-model-agent-first-pressure-packet.md) closed as `no-change-proven` with docs/diagnostics watch; no public concept admitted |

## Pressure Packet Template

每个 `CAP-PRESS-*` packet 必须包含：

| field | required content |
| --- | --- |
| `target_atoms` | 被挑战的 `CAP-* / VOB-*` |
| `pressure_mode` | `adversarial`，或说明为何本 packet 只允许 watch |
| `capability_bundle` | 互相组合施压的 `CAP-* / VOB-*` 集合 |
| `cross_pressure_axes` | 同时被挑战的 owner / truth lane |
| `current_shape_under_attack` | 当前 frozen API shape 中被挑战的公开面或 internal law |
| `adversarial_scenarios` | 构造出来攻击当前设定的场景，不新增 `SC-*` 主键时标为 local proof sample |
| `expected_failure_mode` | 期望打穿当前形状的具体路径 |
| `forced_counter_shapes` | 至少两个可行替代 API 方向及其 public surface delta / owner law / proof cost / rejection reason |
| `status_quo_burden` | no-public-change 必须证明的 readability、generation stability、no hidden second truth、combined proof |
| `implementation_proof_route` | 文档推理不足时的 implementation proof 范围、触发条件、生命周期 |
| `concept_admission_gate` | 新 public concept 的准入判断与淘汰条件 |
| `surface_forcing_signal` | 什么证据足以说明必须新增、删除或调整 public API |
| `internal_boundary_signal` | 什么证据只要求 internal law、naming、substrate 或 proof 变化 |
| `proof_plan` | 需要补的 test / proof sample / contract |
| `decision_outputs` | `no-change-proven`, `internal-law`, `implementation-task`, `COL-*`, `PRIN-*`, `authority-writeback`, `reopen-frozen-shape` |
| `non_claims` | 本 packet 不冻结的 exact spelling、helper placement、public route |

## Next Action

当前 `CAP-PRESS-001`、`CAP-PRESS-002`、`CAP-PRESS-003`、`CAP-PRESS-004`、`CAP-PRESS-005`、`CAP-PRESS-007-FU1`、`CAP-PRESS-007-FU2`、`HUMAN-PRESS-001` 与 `AGENT-PRESS-001` 已关闭。`TASK-009` 已关闭 `fieldValue` typed path，并接受 returned-carrier companion exact typing partial close；除非用户显式选择 root compare authority intake，当前没有必须继续压的非 blocked slice。

原因：

- 当前 packet 已关闭 `CAP-PRESS-001-FU1`：删除 day-one `manual` source trigger，并将 controlled manual refresh 保留为后续 reopen candidate。
- 当前 packet 已关闭 `CAP-PRESS-001-FU2` 的 planning law 与 `TASK-007` implementation proof：source task identity 与 key canonicalization 保持 internal。
- 当前 packet 已关闭 `CAP-PRESS-001-FU3`：`exhaust-trailing + debounceMs + submitImpact:block` 由内部 submit-time freshness flush 覆盖，不新增 public source API。
- 当前 packet 已关闭 `CAP-PRESS-001-FU4`：source failure lifecycle under `block / observe` 由 source snapshot、submitImpact 与 `Form.Error.field(path)` 覆盖，不新增 public source API。
- 当前 packet 已关闭 `CAP-PRESS-001-FU5`：receipt artifact-to-feed/report join 由 artifact-backed linking law 覆盖，report guard 已收紧，不新增 public receipt API。
- 当前 packet 已关闭 `CAP-PRESS-001-FU6`：row-scoped source writeback under reorder/remove 由 rowId gate 覆盖，不新增 public row receipt API。
- `CAP-PRESS-002` 已关闭：公开 API 未重开，submit generation、field-level stale drop、path-sensitive source pending、warning non-blocking law、list.item return normalization、root/list stale settlement identity、CAP-15 multi-error causal backlink 与 rule fail channel 都已由 `TASK-008` 证明。
- `CAP-PRESS-003` 已由 [cap-press-003-fu1-real-runtime-row-owner-proof.md](./cap-press-003-fu1-real-runtime-row-owner-proof.md) 关闭：real-runtime row owner combined proof 通过；public row owner primitive、list/root companion、second host read family、public cleanup/read-exit primitive 都未进入 surface registry。
- `CAP-PRESS-004` 已由 [cap-press-004-companion-soft-fact-boundary-pressure-packet.md](./cap-press-004-companion-soft-fact-boundary-pressure-packet.md) 关闭：companion soft fact boundary 在 source、final truth、row owner 与 host selector overlay 下未逼出 list/root companion、companion final truth owner、source/options merge、generic `Fact / SoftFact` namespace 或第二 companion read family。
- `CAP-PRESS-005` 已由 [cap-press-005-verification-scenario-report-pressure-packet.md](./cap-press-005-verification-scenario-report-pressure-packet.md) 关闭：verification/report pressure 未逼出 public scenario carrier、second report object、raw evidence default compare surface、public receipt coordinate expansion、expectation truth owner 或 root compare productization。
- `CAP-PRESS-007-FU1` 已由 [cap-press-007-fu1-selector-type-safety-ceiling.md](./cap-press-007-fu1-selector-type-safety-ceiling.md) 关闭为 `implementation-task`：single `useSelector` host gate 不重开，第二 host/read family、Form-owned hooks、schema path builder 和永久宽 `string path` 终局 stance 被拒绝；`fieldValue` typed path 与 returned-carrier companion exact typing 已由 `CAP-PRESS-007-FU2` / `TASK-009` 闭合。
- `CAP-PRESS-007-FU2` 已由 [cap-press-007-fu2-typed-path-metadata-chain.md](./cap-press-007-fu2-typed-path-metadata-chain.md) 关闭 pressure：`TASK-009` 已关闭 `fieldValue` typed path 与 returned-carrier `Form.Companion.field/byRowId` exact lower-result inference；imperative `void` callback 保持 runtime-valid / honest-unknown；public `Form.Path` / typed descriptor family / public metadata object / second hook family 当前未准入。
- `HUMAN-PRESS-001` 已由 [human-press-001-first-read-acceptance-taste-pressure-packet.md](./human-press-001-first-read-acceptance-taste-pressure-packet.md) 关闭，`HUMAN-PRESS-001-FU1` 已由 [human-press-001-fu1-docs-teaching-follow-up.md](./human-press-001-fu1-docs-teaching-follow-up.md) 消费 docs task：human first-read、接受阻力与 API taste 压力未逼出 public `Form.Path`、Form-owned hooks、list/root companion、public row owner token、generic `Fact / SoftFact`、carrier-bound selector route 或 void callback auto-collection；剩余 diagnostic 暂留 watch。
- `AGENT-PRESS-001` 已由 [agent-press-001-medium-model-agent-first-pressure-packet.md](./agent-press-001-medium-model-agent-first-pressure-packet.md) 关闭：GPT-5.5 medium 三路 pressure 均给出 `acceptable-with-docs-risk`，Form authoring、React host selector 与 runtime verification 均未逼出 public concept；剩余 owner-lane、selector、returned-carrier 与 verification-stage 风险留给 docs/diagnostics watch。

## 当前一句话结论

第二轮 pressure 不再按已关闭的 `RISK-01..RISK-06` 重跑。`CAP-PRESS-001-FU1 / FU2 / FU3 / FU4 / FU5 / FU6 / TASK-007` 已关闭；source lane 未重开 public source API。`CAP-PRESS-002 / TASK-008` 已关闭；`CAP-PRESS-003 / FU1` 已关闭，row owner pressure 未重开 frozen public API。`CAP-PRESS-004` 与 `CAP-PRESS-005` 已关闭，companion 与 verification/report pressure 均未重开 frozen public API。`CAP-PRESS-007-FU1 / FU2` 与 `TASK-009` 已关闭当前矩阵压力；`HUMAN-PRESS-001` 已关闭 human/taste pressure，`HUMAN-PRESS-001-FU1` 已消费 docs/examples follow-up；`AGENT-PRESS-001` 已关闭 medium-model Agent-first pressure；当前没有必须继续压的非 blocked slice；`TASK-003` 仍需显式 authority intake。
