# Quickstart: 060 Txn Lanes（怎么用 / 怎么验收）

## 1) 我什么时候需要看/用 060？

- 你遇到了“交互 p95 被拖尾”：输入/点击持续发生时，明显感到卡顿，但卡顿主要来自非关键补算/派生/通知的堆积。
- 你已经启用了 043 的 deferred converge（或类似“事务后续补算”），但发现 **deferred flush 本身会堵住后续交互**（队列拖尾）。

## 2) 我如何理解 Txn Lanes？

- 它不是“可中断事务”。事务仍同步、零 IO。
- 它解决的是：**事务之外的 Follow-up Work**（补算/flush/通知）如何不再拖垮关键交互的 p95。
- 它也不是 React 的 `startTransition`：Txn Lanes 延后的是 Logix 内部计算/调度（以及可能的 ExternalStore 通知），而 `startTransition` 延后的是 React 渲染调度；两者可组合但不能互相替代。
- 关键点：
  - urgent：交互关键路径优先完成；
  - non-urgent：可延后，但必须在上界内追平，且可解释；
  - lane-aware queue + work loop：非紧急工作让路、分片、合并/取消中间态。

## 3) 我怎么开启？

> 默认仍关闭，需显式开启；未来若切默认开启，会通过单独迁移 spec 交付，并保留显式回退/对照入口。本 quickstart 描述的是当前计划中的入口与验收。

- Runtime/模块/Provider 维度配置（示意）：
  - `stateTransaction.txnLanes.enabled = true`
  - `stateTransaction.txnLanes.budgetMs = <nonUrgent 单片预算>`
  - `stateTransaction.txnLanes.debounceMs = <合并窗口>`
  - `stateTransaction.txnLanes.maxLagMs = <最长延迟上界>`
  - `stateTransaction.txnLanes.allowCoalesce = true`
  - （可选）`stateTransaction.txnLanes.yieldStrategy = baseline | inputPending`

## 4) 我怎么验证生效（不靠猜）？

- 配置契约：`TxnLanePolicy` 的输入（含 overrides 合并结果）应可被 schema 校验（见：`specs/060-react-priority-scheduling/contracts/schemas/txn-lane-policy.schema.json`）。
- 诊断/证据（light/full 或 sampled）应能导出 `TxnLaneEvidence`（见：`specs/060-react-priority-scheduling/contracts/schemas/txn-lane-evidence.schema.json`），至少包含：
  - lane（urgent/nonUrgent）
  - backlog 摘要（pendingCount/ageMs/coalescedCount/canceledCount）
  - reasons（budget_yield / preempted_by_urgent / max_lag_forced 等）
  - budget.yieldReason（例如：input_pending / budget_exceeded / forced_frame_yield）
- 浏览器 perf boundary：
  - 运行 `packages/logix-react/test/browser/perf-boundaries/txn-lanes.test.tsx`（off vs on），观察 urgent p95 与 backlog 追平是否达标。
  - （可选）对照 `shouldYieldNonUrgent`：设置 `VITE_LOGIX_PERF_TXN_LANES_YIELD_STRATEGY=baseline|inputPending` 再跑一轮（重点看 backlog 追平与 urgent p95 是否回归）。

## 5) 性能证据如何落盘？

> 硬结论证据必须在独立 `git worktree/单独目录` 中采集；混杂工作区仅作线索。

- collect/diff 命令以 `specs/060-react-priority-scheduling/plan.md` 的 Perf Evidence Plan 为准。
- 若实现包含 work loop 分片：必须补齐 slicing microbench 的 before/after/diff，并用结果反推预算粒度（避免调度开销吞掉收益）。
- core-ng（trial）不得跳过：同一套 off/on 证据需要在 core-ng 下复跑并落盘，否则不得宣称“支持 core-ng”。

### Browser（off vs on）

- core：
  - before：`VITE_LOGIX_PERF_TXN_LANES_MODE=off pnpm perf collect -- --profile default --out specs/060-react-priority-scheduling/perf/before.browser.txnLanes.off.worktree.<envId>.default.json --files test/browser/perf-boundaries/txn-lanes.test.tsx`
  - after：`VITE_LOGIX_PERF_TXN_LANES_MODE=on pnpm perf collect -- --profile default --out specs/060-react-priority-scheduling/perf/after.browser.txnLanes.on.worktree.<envId>.default.json --files test/browser/perf-boundaries/txn-lanes.test.tsx`
  - diff：`pnpm perf diff -- --before specs/060-react-priority-scheduling/perf/before.browser.txnLanes.off.worktree.<envId>.default.json --after specs/060-react-priority-scheduling/perf/after.browser.txnLanes.on.worktree.<envId>.default.json --out specs/060-react-priority-scheduling/perf/diff.browser.txnLanes.off__on.worktree.<envId>.default.json`

- core-ng（trial）：在上述命令前额外加 `VITE_LOGIX_PERF_KERNEL_ID=core-ng`，并把文件名里的 `txnLanes.*` 改为 `core-ng.txnLanes.*` 以区分。

### Browser（`yieldStrategy` 对照）

> 同一 workload 下比较 `baseline` vs `inputPending`（都在 `mode=on` 下），用来回答“是否更偏交互优先 / 是否影响追平速度”。

- baseline：`VITE_LOGIX_PERF_TXN_LANES_MODE=on VITE_LOGIX_PERF_TXN_LANES_YIELD_STRATEGY=baseline pnpm perf collect -- --profile default --out specs/060-react-priority-scheduling/perf/before.browser.txnLanes.on.yieldStrategy-baseline.worktree.<envId>.default.json --files test/browser/perf-boundaries/txn-lanes.test.tsx`
- inputPending：`VITE_LOGIX_PERF_TXN_LANES_MODE=on VITE_LOGIX_PERF_TXN_LANES_YIELD_STRATEGY=inputPending pnpm perf collect -- --profile default --out specs/060-react-priority-scheduling/perf/after.browser.txnLanes.on.yieldStrategy-inputPending.worktree.<envId>.default.json --files test/browser/perf-boundaries/txn-lanes.test.tsx`
- diff：`pnpm perf diff -- --before specs/060-react-priority-scheduling/perf/before.browser.txnLanes.on.yieldStrategy-baseline.worktree.<envId>.default.json --after specs/060-react-priority-scheduling/perf/after.browser.txnLanes.on.yieldStrategy-inputPending.worktree.<envId>.default.json --out specs/060-react-priority-scheduling/perf/diff.browser.txnLanes.on.yieldStrategy-baseline__inputPending.worktree.<envId>.default.json`

### Node（work loop slicing microbench）

> 目的：量化 non-urgent work loop 的分片调度开销/收益，避免“让路收益被调度成本吞噬”。

- core：`RUN_LABEL=worktree pnpm perf bench:060:txn-lanes-workloop`
- core-ng：`LOGIX_PERF_KERNEL_ID=core-ng RUN_LABEL=worktree pnpm perf bench:060:txn-lanes-workloop`
