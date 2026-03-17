# 2026-03-22 · P1-6'' owner-aware resolve engine（implementation-ready design package）

## 目标与范围

- worktree：`/Users/yoyo/Documents/code/personal/logix.worktrees/v4-perf.p1-6pp-owner-resolve-engine`
- branch：`agent/v4-perf-p1-6pp-owner-resolve-engine`
- 本轮目标：尝试为 `P1-6'' owner-aware resolve engine` 直接开 implementation line。
- 本轮实际收口：`docs/proposal-only`，不保留 `packages/**` 实现改动。

## 结论类型

- `docs/evidence-only`
- `implementation-ready=false`
- 结果分类：`discarded_or_pending`

## 结论

`P1-6'' owner-aware resolve engine` 当前仍 `not-ready`，不能直接开 implementation line。  
本轮按 docs/proposal-only 收口，不保留 `packages/**` 实现改动。

## 为什么现在不能直接实施

1. 缺少统一的入口级合同定义。
- `read/readSync/warmSync/preload` 四类入口还没有被同一份“owner-phase/owner-lane 决策契约”显式约束。
- 当前只有局部 lane phase-machine 规则，尚不足以覆盖四入口的一致语义。

2. 缺少统一的 phase-trace 事件契约。
- 现有 trace 仍以 lane 视角为主，缺少面向“四入口同口径”的稳定字段集合。
- 没有固定的 reason taxonomy，后续实施容易引入事件语义漂移。

3. 缺少实现前的最小 gate 套件。
- 还没有“设计完备性 gate + 断言完备性 gate + 可比性 gate”的串行门禁。
- 直接实施会把 gate 噪声与实现收益混在一起，无法稳定裁决 accepted。

## 最小设计缺口（必须先补齐）

### D1 · 单一入口合同

需要先定义 `OwnerResolveRequested` 内部合同，至少包含：
- `ownerKey`
- `lane`
- `phase`
- `method`（限定为 `read/readSync/warmSync/preload`）
- `action/reason/executor/cancelBoundary/readiness`
- `token/fingerprint`（用于 stale/commit 判定）

### D2 · stale/commit 语义矩阵

需要先落地一份单表，覆盖：
- `owner+lane+token` 过期判定
- stale drop reason code 集合
- commit 拒绝 reason code 集合
- 与 `kernel-ticket-expired` 的关系边界

### D3 · phase-trace 稳定字段集

需要固定事件字段和断言口径，至少保证：
- 四入口事件可一跳映射到同一 owner-phase 合同
- 同 ownerKey+epoch+lane 的 commit 计数可判定
- 事件不依赖时间窗口容错

### D4 · 断言矩阵

`runtime-bootresolve-phase-trace` 需要明确四入口最小断言集：
- `read`：owner-lane/phase/action/reason 稳定
- `readSync`：owner-phase 契约稳定且与 read 区分明确
- `warmSync`：ready/pending 语义稳定
- `preload`：dispatch/reuse/token-completed 分支稳定

## 后续 gate（开 implementation line 前必须全部通过）

1. `Gate-A design-contract`
- D1~D3 文档落盘且 cross-reference 完整。
- reviewer 可仅看文档就复现契约边界。

2. `Gate-B test-contract`
- D4 断言矩阵落盘并可直接映射到测试文件。
- 明确每条断言对应的 contract 字段与失败分类。

3. `Gate-C evidence-comparability`
- 先约定收益锚点只看 bootresolve owner-phase 合同相关证据。
- `probe_next_blocker` 失败仅可作为 gate 噪声记录，不能计入收益。

## 开线准入条件（implementation-ready 定义）

只有当以下条件同时满足，才可开 `P1-6''` 实施线：
- `Gate-A/B/C` 全通过
- 明确 `no public API change` 仍成立
- 明确不触 `packages/logix-core/**`
- 最小验证链路和证据命名已预先固定

## 本轮收口说明

- 本轮不实施代码。
- 本轮不改 public API。
- 本轮不改 `packages/logix-core/**`。
- 本轮只更新 docs/specs 证据与路由口径。
