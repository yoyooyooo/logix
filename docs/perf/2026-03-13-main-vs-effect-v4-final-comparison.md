# 2026-03-13 · main vs effect-v4 最终性能对比（阶段收口）

本页只收口当前已拿到的、可复述的分支级性能结论。

约束：
- 只下有证据支撑的结论
- 对未收口项明确标为未定
- broad self-run 与 direct compare 分开使用

## 结论摘要

当前可以较有把握地说：

1. `effect-v4` 相比 `main`，没有拿到稳定的总体性能倒退证据。
2. `effect-v4` 在两条关键链路上有明确提升：
   - `watchers`
   - `react.bootResolve` 的 `suspend` 路径
3. `effect-v4` 在 `react.bootResolve` 的 `sync` 路径上有稳定小固定税。
4. `externalStore.ingest.tickNotify` 仍是两边共同未收口的绝对预算债，不下“分支回退”结论。

## 证据分组

### A. 明确提升

#### A1. `watchers`

- 关键证据：`22993176276`
- 口径：targeted direct compare
- 结论：`regressions=0 / improvements=10`
- 最终裁决：`effect-v4` 明确更好

根因与保留刀：
- 真实问题在 direct action state writeback 的事务内逐条执行
- 有效刀已合回 `effect-v4`
- 提交：`95462a2e`
- 落点：`packages/logix-core/src/internal/runtime/core/ModuleRuntime.dispatch.ts`

#### A2. `react.bootResolve.suspend`

- 关键证据：`22996148884`
- 复核：`22997110261`、`22997112372`（`soak`）
- 结果：
  - `suspend` 路径从 `~314ms` 级降到 `~16.4ms`
- 最终裁决：`effect-v4` 明确更好

### B. 基本持平

#### B1. `dispatch-shell`

- 关键证据：`22985633057`
- 口径：aligned direct compare
- 最终裁决：基本持平

#### B2. `react.deferPreload`

- 关键证据：`22996148884`
- broad self-run 复核：`23013191849`、`23013194289`
- 最终裁决：整体基本持平

### C. 小固定税

#### C1. `react.bootResolve.sync`

- 关键证据：`22996148884`
- soak 复核：`22997110261`、`22997112372`
- 结果：
  - `sync` 路径稳定慢 `~1.4ms ~ 1.6ms`
- 最终裁决：存在小固定税，但不构成 broad 级总体回退

### D. 未收口

#### D1. `externalStore.ingest.tickNotify`

- 关键证据：`22996148884`
- soak 复核：`22997114682`、`22997117046`、`22997119721`
- broad self-run：`23013191849`、`23013194289`

当前事实：
- `effect-v4` 自身仍过不了绝对预算 `p95<=3ms`
- `main` 也没有把这条线收干净
- direct compare 下：
  - `watchers=128`，`effect-v4` 更好
  - `256/512`，结果混合
- 因此当前只能裁定为：
  - 共同未收口的绝对预算债
  - 不下“effect-v4 相比 main 稳定回退”的结论

## broad self-run 用法说明

本轮 broad self-run：
- `main` 修复后：`23013191849`
- `effect-v4`：`23013194289`

用途：
- 看各分支自身盘面是否健康
- 不直接替代 direct compare

原因：
- broad self-run 包含各分支内部 benchmark 形态与 `full` preset 的 auto probe / tail recheck
- 分支差异判断仍应优先以 direct compare 为准

## 当前 broad 盘面

### `main` 修复后 broad

- `externalStore.ingest.tickNotify` 仍红
- `converge.txnCommit` 有 1 处 tail-only 比值告警，但 tail recheck 已收住
- capacity snapshot 到 `3200`

### `effect-v4` broad

- `externalStore.ingest.tickNotify` 仍红
- `converge.txnCommit` 也有 1 处 tail-only 比值告警
- `watchers` broad 仍红，但这条不作为分支最终优劣裁决依据

## 最终判断

当前阶段最终判断：

- `effect-v4` 相比 `main` 没有稳定的总体性能倒退证据
- `effect-v4` 在两条关键链路上有明确提升：
  - `watchers`
  - `react.bootResolve.suspend`
- `effect-v4` 在 `react.bootResolve.sync` 上有小固定税
- `externalStore` 仍是两边共同未收口的绝对预算债

## 下一步建议

若继续推进：
1. 优先收口 `externalStore.ingest.tickNotify` 的绝对 `p95<=3ms`
2. 其次再看 `react.bootResolve.sync` 的小固定税是否值得继续砍
3. `watchers` 当前不再作为默认 blocker
