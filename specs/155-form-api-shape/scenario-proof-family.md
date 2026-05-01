# 155 Scenario Proof Family Projection

**Role**: `docs/ssot/form/06` 主场景矩阵的 `WF* / W*` 投影视图
**Status**: Living Working Artifact  
**Feature**: [spec.md](./spec.md)
**Source Matrix**: [docs/ssot/form/06-capability-scenario-api-support-map.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/form/06-capability-scenario-api-support-map.md)

## Purpose

把 `docs/ssot/form/06` 的 `SC-*` 主场景矩阵，投影成 `155` 评审和实现期继续使用的 `WF1..WF6` family 视图与 `W1..W5` executable 视图。

它服务三件事：

1. 帮 `AC3.3 / AC4.1 / future challenger` 按同一组 `SC-*` 场景核对覆盖
2. 帮 `TRACE-I1 / TRACE-I2` 解释 `W1..W5` executable proof 与 benchmark whitelist 的来源
3. 作为 authority promotion 讨论中的长期证据目录

## What This File Is

- 它是 `06` 主场景矩阵在 `155` 下的 scenario proof family projection
- 它不持有第二套长期 pressure corpus
- 它不定义 public noun
- 它不替代 `spec.md` 的原则 authority
- 它不替代 `candidate-ac3.3.md` 的 active contract
- 它不替代 `docs/ssot/form/06-capability-scenario-api-support-map.md` 的 `SC-*` 主矩阵

## Import Source

这份 family 直接派生自：

- [docs/ssot/form/06-capability-scenario-api-support-map.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/form/06-capability-scenario-api-support-map.md)

同时参考：

- [spec.md](./spec.md)
- [candidate-ac3.3.md](./candidate-ac3.3.md)
- [challenge-s2-row-heavy-proof-pack.md](./challenge-s2-row-heavy-proof-pack.md)
- [challenge-c003-diagnostics-causal-chain.md](./challenge-c003-diagnostics-causal-chain.md)
- [challenge-runtime-scenario-proof-execution.md](./challenge-runtime-scenario-proof-execution.md)
- [challenge-runtime-benchmark-evidence.md](./challenge-runtime-benchmark-evidence.md)

## Rules

- 每个 family 都必须能回链：
  - `SC-*` scenario id
  - declaration slice
  - kernel enabler
  - scenario proof
  - verification proof
- 每个 future challenger 都必须回答：
  - 它是否覆盖 `06` 主矩阵里的同一组 `SC-*`
  - 若不能覆盖，哪一条是无法归并到 `SC-*` 的 irreducible new scenario
- implementation 与 benchmark 只允许从 `06` 的 `SC-* / WF* / W*` 派生 whitelist，不得额外长第二套 pressure corpus
- 单个 family 可以拆成多个 executable proof，但 family 本身必须能稳定回链 `06`

## Family Matrix

| family | derived scenario ids | long-lived proof | pressure surfaces | declaration slices | kernel enablers | required proof |
| --- | --- | --- | --- | --- | --- | --- |
| `WF1` | `SC-B`, `SC-C`, `SC-D` | remote options + cross-row mutual exclusion | `source / companion-or-fact / rule / row identity` | `field.source + field companion + rule` | source receipt、candidate lowering、row identity、rule lowering | 远程 facts 只经 `source` 进入；跨行互斥不长第二 truth；重排后互斥仍稳定 |
| `WF2` | `SC-E` | reorder + byRowId continuity | `row identity / read route / cleanup` | `list identity + byRowId read` | canonical row id chain、trackBy、owner binding carrier | `reorder` 不造新 truth；`byRowId` 继续命中同一 canonical row；index/synthetic id 只作 residue |
| `WF3` | `SC-E` | replace + active exit + cleanup | `presence / cleanup / stale exit / row lifecycle` | `list replace + active exit + cleanup` | roster replacement、cleanup receipt、subordinate backlink | old row truth 彻底退出；只剩 cleanup residue；hidden stale identity 不得残留 |
| `WF4` | `SC-B`, `SC-D` | async rule + submit blocking | `settlement / pending / stale / submit gate` | `field/list/root async contributor + submitImpact` | keyed task substrate、debounce、cancel、submit snapshot | pending/stale/blocking 只落单一 submit truth；later settle 不改写旧 submit snapshot |
| `WF5` | `SC-B`, `SC-C`, `SC-D`, `SC-E`, `SC-F` | diagnostics causal chain | `reason / evidence / patch / read / outcome` | `source + companion + rule/submit` | evidence envelope、bundle patch、reason slot | `source -> patch -> reason` 可机械回链；不长第二 explain/report truth |
| `WF6` | `SC-B`, `SC-C`, `SC-D`, `SC-E`, `SC-F` 的 benchmark-admissible subset | benchmark-admissible execution whitelist | `execution reuse / comparability / perf evidence` | `TRACE-I1 handoff + TRACE-I2 gate` | execution carrier、compare hook、artifact-backed report | 只复用 execution carrier；perf evidence 不反向污染 correctness truth |

## Family Details

### WF1 Remote Options + Cross-Row Mutual Exclusion

Derived scenario ids: `SC-B`, `SC-C`, `SC-D`

长期母场景：

- 城市/仓库 options 远程加载
- 当前行已选择值在其他行不能再次可选
- 可通过 `availability` 或 `candidates` 表达本地 soft fact
- 若出现重复最终仍由 `rule` 或 submit truth 兜底

长期压力点：

- `source` 是否仍是唯一 remote fact ingress
- 本地 soft fact 是否会滑回组件 glue
- `AC4.1 fact` 是否会吸入 `reason / pending / submit truth`

### WF2 Reorder + byRowId Continuity

Derived scenario ids: `SC-E`

长期母场景：

- 动态列表重排
- `byRowId` 读取
- `trackBy` 存在与缺失分支

长期压力点：

- row truth 是否始终回链 canonical row id chain
- render order 是否被错误抬成公开真相
- diagnostics / read route 是否仍沿同一 owner binding

### WF3 Replace + Active Exit + Cleanup

Derived scenario ids: `SC-E`

长期母场景：

- `replace(nextItems)`
- 条件隐藏
- 删除行
- active exit

长期压力点：

- roster replacement 是否真正终止旧 row truth
- cleanup 是否只留 subordinate residue
- stale identity 是否偷偷保留

### WF4 Async Rule + Submit Blocking

Derived scenario ids: `SC-B`, `SC-D`

长期母场景：

- 唯一性检查
- 远端约束校验
- async rule / submit blocking / later settle

长期压力点：

- pending / stale / blocking 是否继续只落在单一 submit truth
- contributor grammar 是否仍是唯一入口
- later settle 是否会污染旧 submit snapshot

### WF5 Diagnostics Causal Chain

Derived scenario ids: `SC-B`, `SC-C`, `SC-D`, `SC-E`, `SC-F`

长期母场景：

- 当前 fact / soft fact 从哪次 source 来
- 这次 patch 是否导致 rule / submit outcome
- cleanup / stale / terminate 链是否可解释

长期压力点：

- `sourceReceiptRef / derivationReceiptRef / bundlePatchRef / reasonSlotId` 是否始终处于同一 evidence envelope
- 是否长第二 explain object / 第二 issue tree / 第二 report truth

### WF6 Benchmark-Admissible Execution Whitelist

Derived scenario ids: `SC-B`, `SC-C`, `SC-D`, `SC-E`, `SC-F` 的 benchmark-admissible subset

长期母场景：

- 只对白名单场景做 baseline / compare / budget
- environment fingerprint 与 invalidation reason 决定 comparability

长期压力点：

- perf evidence 是否仍只复用 execution carrier
- 是否把 perf gate 错误抬成 correctness truth

## Executable Subset Mapping

当前 `155` 已冻结的 executable subset 直接派生自 `06` 的 `Executable Proof 映射`。

局部 execution law 继续看：

- [challenge-runtime-scenario-proof-execution.md](./challenge-runtime-scenario-proof-execution.md)

映射关系暂固定为：

| executable proof | derived scenario ids | family coverage |
| --- | --- | --- |
| `W1 source-refresh-multi-lower` | `SC-C`, `SC-D` | `WF1`, `WF5` |
| `W2 clear-while-active` | `SC-C`, `SC-E` | `WF3`, `WF5` |
| `W3 row-reorder-byRowId` | `SC-E` | `WF2`, `WF3` |
| `W4 row-replace-active-exit` | `SC-E` | `WF3`, `WF5` |
| `W5 rule-submit-backlink` | `SC-D`, `SC-F` | `WF4`, `WF5` |

当前 benchmark whitelist 继续按 `06` 的 `WF6` 与 `W*` projection 解释，局部 law 看：

- [challenge-runtime-benchmark-evidence.md](./challenge-runtime-benchmark-evidence.md)

本文件不另长第二张 benchmark 表。

## Usage

### For AC3.3

- 必须说明自己如何覆盖 `06` 的 `SC-*` 主矩阵，并用 `WF1 .. WF6` 解释压力投影
- 若某个 family 仍未闭环，只能把它记为 evidence gap，不能绕开

### For AC4.1

- 若未来重开，必须在 `06` 的同一组 `SC-*` 上给出不弱于 `AC3.3` 的覆盖
- 不能只靠命名更直或 authoring 更顺取胜

### For TRACE / Implementation

- `TRACE-I1` 只冻结 executable proof
- `TRACE-I2` 只冻结 benchmark evidence
- actual code / empirical evidence 继续围绕 `06` 的 `SC-*` 主矩阵补齐，`WF1 .. WF6` 只作 pressure projection

## Non-Goals

- 维护第二张场景矩阵
- 维护第二张 API taxonomy
- 替代 `spec.md` 的 principle authority
- 替代 `candidate-ac3.3.md` 的 contract authority
- 抢跑 future public noun

## Backlinks

- [spec.md](./spec.md)
- [discussion.md](./discussion.md)
- [candidate-ac3.3.md](./candidate-ac3.3.md)
- [candidate-ac4-field-fact-lane.md](./candidate-ac4-field-fact-lane.md)
- [challenge-ac4-r1-field-fact-lane-boundary-pressure.md](./challenge-ac4-r1-field-fact-lane-boundary-pressure.md)
- [challenge-runtime-scenario-proof-execution.md](./challenge-runtime-scenario-proof-execution.md)
- [challenge-runtime-benchmark-evidence.md](./challenge-runtime-benchmark-evidence.md)
- [docs/ssot/form/06-capability-scenario-api-support-map.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/form/06-capability-scenario-api-support-map.md)
