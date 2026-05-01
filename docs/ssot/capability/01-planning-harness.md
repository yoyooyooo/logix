---
title: Logix Capability Planning Harness
status: living
version: 3
---

# Logix Capability Planning Harness

## 目标

定义从场景到能力原子、planning projection、collision、proof、principle promotion、proposal portfolio 和 implementation-ready plan 的通用 workflow。

本页是所有 domain capability projection 的上层 harness。Form、Query、Host、Runtime、Verification 等 domain 只能继承或扩展本页规则，不能自造第二套流程。

本页同时约束两层循环：

- 局部 slice 循环：单个 `SC-* / CAP-* / PROJ-*` 被 proposal、review、collision、proof 和 writeback 推进
- 全局 shape 循环：所有局部 delta 汇总后，必须继续接受概念数量、公开面、proof strength、authority consistency 和整体覆盖的闭合检查

局部 proof 成功不能直接等于整体 API shape 收敛。整体收敛只能通过 Global API Shape Closure Gate 声明。

## Default Execution Topology

进入这个 harness 后，默认执行拓扑是 `multi-agent`。

- main agent 负责协调、切片、分发 packet、综合结论、回写 control-plane 文档
- planning sub-agent 负责单 slice 的 proposal / collision / principle / proof / snapshot 草案
- review sub-agent 负责挑战草案、施压 capability 覆盖与 generator efficiency、产出 review 结论
- implementation proof sub-agent 只在 proof gate 或 collision close predicate 需要可执行证据时启用

main agent 默认不直接写 planning argument。若 sub-agent 能力暂时不可用，main agent 可以本地执行被阻塞步骤，但必须把 fallback 原因写入 run-state 或 ledger。

## Coverage Kernel

所有 proposal、sub-agent 输出、projection freeze 和 authority writeback 都必须先过这组 kernel。

| rule | statement |
| --- | --- |
| `single-scenario-source` | 场景主键只能由对应 domain SSoT 持有 |
| `single-capability-decomposition` | capability atom、projection、collision、proof 只能由对应 planning harness 持有 |
| `one-owner-per-atom` | 每个 `CAP-*` 只能有一个 primary owner lane |
| `projection-cannot-freeze-surface` | `PROJ-*` 只能是 planning lane，exact API 只能由 owner authority 冻结 |
| `no-uncovered-claimed-scenario` | proposal 声称覆盖某个 `SC-*` 时，必须列出对应 `CAP-*` 覆盖 |
| `no-hidden-gap` | 未覆盖 capability 必须进入 `excluded_caps` 或 `residual_risks` |
| `collision-before-adoption` | 覆盖重叠或 projection 修改重叠时，必须先进入 `COL-*` |
| `proof-before-authority` | 没有 `PF-* / VOB-*`，不能请求 authority writeback |
| `dominance-required` | 新 proposal 必须提升 `proof-strength` 或 `future-headroom`，且不能扩大 `public-surface` |
| `smallest-sufficient-lane` | 优先选择覆盖所需 capability 的最小 projection 组合 |
| `minimal-generator-first` | 优先寻找能生成多个 capability 的少数公开概念，拒绝把 capability 一比一翻译成 API |
| `adversarial-pressure-required` | 高风险 pressure 不能只验证当前 frozen shape，必须构造 capability bundle、counter-shape 和 no-change 证明负担 |
| `surface-candidate-ledger` | 任何公开概念候选都必须进入 surface candidate registry，不能只停在 snapshot prose |
| `artifact-local-until-promoted` | implementation proof 默认只产生 artifact-local evidence，不能自动升格成 authority law |
| `verification-artifact-lifecycle-required` | verification artifact 必须有 keep / generalize / demote / delete 生命周期裁决 |
| `global-closure-before-total-shape` | 声明整体 API shape ready 前必须通过 Global API Shape Closure Gate |
| `frozen-shape-has-single-output` | Global API Shape Closure Gate 通过后，覆盖矩阵的总形状只能落到 [03-frozen-api-shape.md](./03-frozen-api-shape.md)，owner authority 只保留 leaf exact law |

## Core Coordinates

| prefix | meaning | owner |
| --- | --- | --- |
| `SC-*` | scenario id | domain scenario SSoT |
| `CAP-*` | capability atom | domain planning harness |
| `PROJ-*` | API planning projection | domain planning harness |
| `IE-*` | internal enabler | domain planning harness |
| `PF-*` | proof / fixture / verification harness | domain planning harness |
| `VOB-*` | verification-only obligation | domain planning harness |
| `COL-*` | collision record | domain planning harness |
| `PRIN-*` | promoted principle candidate or adopted principle | domain planning harness or promoted authority |
| `PROP-*` | proposal portfolio entry | proposal portfolio |
| `SURF-*` | public concept candidate | surface candidate registry |

## Proposal Portfolio Loop

| phase | input | output | owner |
| --- | --- | --- | --- |
| `slice` | target scenarios / caps | Slice Manifest | coordination main agent |
| `draft` | Slice Manifest | proposal draft | planning sub-agent |
| `proposal-review` | proposal draft | review ledger | review sub-agent or reviewer loop |
| `portfolio-admit` | reviewed proposal | portfolio row | coordination main agent |
| `collision-review` | multiple proposals | `COL-*` delta | planning or implementation proof sub-agent plus review sub-agent |
| `principle-promotion` | repeated collisions / rejected reasons | `PRIN-*` candidate | planning sub-agent, adopted by coordination main agent |
| `backpropagate` | adopted principle | updated `CAP / PROJ / COL / PF` | coordination main agent |
| `surface-track` | proposal / collision / proof delta | `SURF-*` registry row | coordination main agent |
| `implementation-proof` | proof gap requiring executable pressure | artifact-local evidence and promotion decision | implementation proof sub-agent plus coordination main agent |
| `verification-artifact-lifecycle-review` | verification artifacts | keep / generalize / demote / delete decision | coordination main agent plus review sub-agent |
| `global-closure` | locally closed proposal set | closure result and next work item | coordination main agent |
| `implementation-ready` | closed projection set | implementation plan seed | planning or implementation proof sub-agent, admitted by coordination main agent |

## Slice Manifest

Sub-agents should not receive the full capability matrix by default. The coordination main agent prepares a slice:

| field | content |
| --- | --- |
| `target_scenarios` | selected `SC-*` |
| `target_caps` | selected `CAP-*` |
| `related_projections` | relevant `PROJ-*` |
| `related_collisions` | relevant `COL-*` |
| `required_proofs` | relevant `PF-* / VOB-*` |
| `coverage_kernel` | the kernel rules above |
| `decision_policy` | [02-api-projection-decision-policy.md](./02-api-projection-decision-policy.md) |
| `non_claims` | exact noun、import shape、helper placement 等本轮不冻结项 |
| `generator_hypothesis` | 本轮 proposal 试图复用或提出的最小生成元 |

当 slice 是 `CAP-PRESS-*`、risk lane、frozen-shape challenge 或高风险 no-public-change review 时，必须额外包含：

| field | content |
| --- | --- |
| `pressure_mode` | `adversarial` 或说明为何不适用 |
| `capability_bundle` | 同时施压的 `CAP-* / VOB-*` 组合，优先覆盖三个以上互相拉扯的能力 |
| `cross_pressure_axes` | 被同时拉扯的 owner / truth lane，例如 source、submit、row、selector、evidence、verification、report、host |
| `current_shape_under_attack` | 被挑战的 frozen public surface 或 internal law |
| `forced_counter_shapes` | 至少两个可行替代 API 方向，或说明无法生成的具体原因 |
| `status_quo_burden` | 不改 public API 时必须证明的 readable / generatable / internally honest / testable 条件 |
| `implementation_proof_route` | 文档推理不足时的 implementation proof 触发条件与范围 |
| `concept_admission_gate` | 新 public concept 的准入条件与淘汰理由 |

## Adversarial Pressure Lane

高风险 pressure 的目标是挑战 frozen shape，不是替 frozen shape 做回归验证。

### Required Structure

| requirement | rule |
| --- | --- |
| `bundle-pressure` | 优先同时压三个以上相关 `CAP-* / VOB-*`，让能力之间发生组合拉扯 |
| `cross-lane-pressure` | 至少压两个 owner / truth lane，避免单点能力测试无法暴露边界 |
| `forced-counter-shape` | A 级或高风险 slice 必须提出至少两个可行替代 API 方向 |
| `status-quo-burden` | 如果结论是不改 public API，必须证明现有写法、内部实现、证据链和测试都能承受组合 proof |
| `executable-proof` | 若文档推理无法判断，必须进入 implementation proof，禁止靠偏好裁决 |
| `concept-admission` | 新公开概念只能在准入条件成立时进入 surface candidate registry |

### Counter-Shape Record

每个 counter-shape 必须记录：

- public surface delta
- owner / truth placement
- first-read impact
- agent generation impact
- implementation sketch
- proof requirement
- concept count delta
- rejection or adoption reason

### Status Quo Burden

no-public-change 结论必须证明：

- 组合 proof 的用户代码仍然首读清楚
- Agent 生成路径稳定，不需要记忆隐藏例外
- 内部实现不需要第二 truth、第二 report object、第二 evidence envelope 或第二 read route
- proof 覆盖组合交互，而不是只覆盖单点 happy path
- artifact-local verification evidence 不会以 scenario / proof / packet 命名直接进入终局实现
- surface registry、implementation gap ledger 与 authority target 保持一致

### Public Concept Admission

只有满足至少一个条件时，才允许把新 public concept 放入候选：

- frozen shape 无法表达已声明场景或必需 capability bundle
- frozen shape 能表达，但 authoring 对首读心智或 Agent 生成稳定性造成明显损害
- 内部支撑需要隐藏第二 truth 或长期特殊 substrate
- 同一缺口跨多个 pressure slice 或 collision 重复出现
- 新概念能替代多个局部补丁，并降低整体概念数或公开面

## Principle Promotion Lane

当 proposal 和 collision 反复暴露更底层规律时，必须从局部 collision 升级为 `PRIN-*`。

### Promotion Triggers

- 同一 collision 影响两个以上 `PROJ-*`
- 同一约束反复出现在三个以上 proposal 的 rejected reason 中
- proof gate 失败说明 capability 拆法或 owner lane 有问题
- exact API 细节需要同时修改多个 authority 才能自洽
- 局部裁决能减少 `concept-count` 或 `public-surface`，并提高 `proof-strength`
- 冲突无法靠单个 `COL-*` 关闭，需要改写 owner law、projection law、evidence law 或 verification law

### Principle Candidate Record

| field | content |
| --- | --- |
| `principle_id` | `PRIN-*` |
| `source_collisions` | `COL-*` |
| `principle_statement` | candidate law |
| `affected_caps` | `CAP-*` |
| `affected_projections` | `PROJ-*` |
| `authority_target` | target SSoT |
| `proof_obligations` | `PF-* / VOB-*` |
| `rejected_alternatives` | alternatives and reasons |
| `status` | `candidate / adopted / rejected / promoted` |

### Backpropagation Record

| field | content |
| --- | --- |
| `change_id` | stable id |
| `promoted_principle` | `PRIN-*` |
| `touched_caps` | updated `CAP-*` |
| `touched_projections` | updated `PROJ-*` |
| `closed_collisions` | closed `COL-*` |
| `reopened_collisions` | reopened `COL-*` |
| `required_writeback` | authority targets |

## Implementation Readiness Gate

A proposal set can be converted into implementation planning only when:

- All claimed scenarios map to covered `CAP-*`
- All open `COL-*` either closed or explicitly deferred with owner and close predicate
- Required `PRIN-*` are adopted or rejected
- Required `PF-* / VOB-*` are executable, planned with blocker, or explicitly out of scope
- Authority writeback targets are known
- A single adoption freeze record exists
- Affected `SURF-*` rows are frozen, rejected, authority-linked, superseded, or explicitly scoped out
- Any artifact-local evidence consumed by the plan has a discard, promotion, authority-request, or implementation-task decision

## Surface Candidate Registry

公开概念候选由 `docs/next/logix-api-planning/surface-candidate-registry.md` 追踪。

它的职责：

- 记录公开概念候选覆盖哪些 `SC-* / CAP-*`
- 记录候选属于哪个 `PROJ-*`
- 记录来源 proposal、collision、proof ledger
- 记录 public surface 增量和 generator verdict
- 记录 proof state 与 authority target
- 记录候选状态

允许状态：

- `candidate`
- `under-review`
- `frozen`
- `rejected`
- `authority-linked`
- `superseded`

该 registry 只服务 planning control plane。它不冻结 exact spelling，不替代 owner authority。

## Implementation Proof Lane

当 proof gate 或 collision close predicate 无法只靠文档判断时，可以启动 implementation proof。

Implementation proof 必须满足：

- 绑定 `PF-* / VOB-*`
- 改动范围尽量停在 internal module 与测试
- 有 review ledger
- 明确标注 `artifact-local`
- 明确写出 proves 与 does-not-prove
- 结束时给出 promotion decision
- 结束时给出 artifact lifecycle decision

允许的 promotion decision：

- `discard`
- `keep-artifact-local`
- `promote-to-principle`
- `promote-to-authority-request`
- `convert-to-implementation-task`

Implementation proof 禁止直接产生：

- public API
- exact surface freeze
- 第二 runtime truth
- 第二 diagnostics 或 report truth
- compare truth admission

### Verification Artifact Lifecycle

Verification artifact 可以辅助测试用例和 proof 成长，但它不能无审查地固化为终局命名或终局实现。

允许 lifecycle state：

- `artifact-local`
- `retained-harness`
- `generalized-internal`
- `demoted-test-fixture`
- `deleted`
- `promoted-authority-request`

触发 lifecycle review：

- artifact 文件跨过一个 wave 仍存在
- artifact 命名带 scenario、proof、packet 等局部语义
- 其他 proof 想复用 helper
- artifact 影响 surface registry 或 implementation plan
- 执行 Global API Shape Closure Gate

review 必须裁决：

- keep、generalize、demote、delete 中哪一个成立
- 命名是否可以继续保留
- artifact 属于 production internal、test harness 还是 fixture
- final owner candidate 是哪个 SSoT 或 authority
- 哪些测试必须保留

## Global API Shape Closure Gate

当局部 proposal、projection 或 proof 看起来已经闭合，或者用户询问整体 API 形状是否 ready 时，必须运行此 gate。

闭合条件：

- 所有场景 SSoT 中的 `SC-*` 都 covered，或带 owner 与 reopen bar 明确 deferred
- 所有 required `CAP-* / VOB-*` 都有 owner lane，或明确排除在本轮 claimed shape 外
- 所有 active `PROJ-*` 都 baseline、rejected、deferred，或带 owner 与 close predicate
- 所有 open `COL-*` 都 closed，或带 owner、close predicate、proof gate 明确 deferred
- 所有 required `PF-* / VOB-*` 都 executable、planned-with-blocker，或 out of scope
- 所有 adopted `PRIN-*` 都有 backpropagation record
- 所有 `SURF-*` 都 frozen、rejected、authority-linked 或 superseded
- 所有高风险 pressure slice 都有 counter-shape rejection record，或说明为什么无法生成 counter-shape
- 所有 no-public-change pressure 决策都有 status quo burden record
- authority writeback target 已落地或排队
- shape snapshot 从 registry 生成并引用状态
- housekeeping 已清理 consumed / superseded 噪声

gate 失败时，失败项成为下一轮 work item。

gate 通过后，若用户要求“覆盖所有能力点的冻结 API 形状”，输出必须写入 [03-frozen-api-shape.md](./03-frozen-api-shape.md)。该页只做全局 frozen shape 汇总，exact spelling 与 route law 继续由对应 owner authority 持有。

## 当前一句话结论

Logix capability planning is a loop: `scenario -> capability -> projection -> surface candidate -> collision -> principle -> backpropagation -> proof / implementation proof -> global closure -> frozen shape -> implementation-ready`.
