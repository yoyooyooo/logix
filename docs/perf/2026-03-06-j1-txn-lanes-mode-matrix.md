# 2026-03-06 · J-1：`txnLanes.urgentBacklog` 显式 mode 轴（default/off）对齐真实产品路径

本刀不是继续硬拧内核常数，而是修正 perf 证据面的结构性偏差。

此前 `packages/logix-react/test/browser/perf-boundaries/txn-lanes.test.tsx` 在 **没有显式 env** 时，会默认把 `VITE_LOGIX_PERF_TXN_LANES_MODE` 解释成 `off`。这意味着 broad matrix / full-matrix collect 默认测到的是 **forced-off 基线**，而不是 runtime 当前的真实默认语义（`TxnLanes` 已 default-on）。

这会导致两个问题：

- broad matrix 在 `txnLanes.urgentBacklog` 上持续混淆“产品默认路径”和“诊断/回退基线”；
- 后续 agent 想继续优化 `txnLanes` 时，看不到同一份报告里 `default` 与 `off` 的并列对照，只能靠手工 env 复跑，证据面太脆弱。

## 结论（已完成）

- `txnLanes.urgentBacklog` 现在改成 **显式 mode 轴**：`mode in ['default', 'off']`。
- broad matrix / targeted collect 在不传额外 env 时，会一次性产出 `steps × mode` 的 6 个点。
- `VITE_LOGIX_PERF_TXN_LANES_MODE` 仍然保留，但只作为 **专项实验 override**，不再承担“隐式默认档位”的职责。

## 改了什么

### 1) matrix 显式声明 `mode` 轴

文件：`.codex/skills/logix-perf-evidence/assets/matrix.json`

- `txnLanes.urgentBacklog.axes` 从：
  - `steps: [200, 800, 2000]`
- 改为：
  - `steps: [200, 800, 2000]`
  - `mode: ['default', 'off']`
- `notes` 明确说明：`mode` 轴显式覆盖 runtime 默认 default-on 与 forced-off 基线，不再依赖隐式 env 默认值。

### 2) browser suite 从“读全局默认 env”改为“优先读 params.mode”

文件：`packages/logix-react/test/browser/perf-boundaries/txn-lanes.test.tsx`

- 新增 `readTxnLanesModeOverride()`：仅用于专项实验 override。
- 新增 `resolveTxnLanesMode(params)`：
  - 有 override 时，强制覆盖；
  - 否则按 `params.mode` 走 `default` / `off`。
- `ensureActive(...)` 现在按 `steps + mode` 复用 runtime，避免不同 mode 复用同一个实例。
- evidence 里的 `txnLanes.mode` / `txnLanes.yieldStrategy` 现在反映真实 point 语义，而不是隐式默认值。

## 证据

### 1) 旧结构（专项 forced-off 基线）

- Before: `specs/103-effect-v4-forward-cutover/perf/s2.before.local.quick.ulw98.txn-lanes-forced-off.targeted.json`

这份报告只有 3 个点（`steps`），默认语义是 `mode=off`。

### 2) 新结构（显式 mode matrix）

- After: `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw100.txn-lanes-mode-matrix.targeted.json`

这份报告现在展开成 6 个点：

- `mode=default, steps=200/800/2000`
- `mode=off, steps=200/800/2000`

并且 threshold 也按 `where: { mode }` 分开记录，不再把两种语义揉成一个隐式档位。

## 本刀的价值判断

这刀的价值不是“宣布 `txnLanes` 已经彻底达标”，而是：

- 让 broad matrix 终于能**同时看见**：
  - 真实产品路径：`mode=default`
  - 回退/对照路径：`mode=off`
- 后续 agent 再继续压 `txnLanes` 时，不需要靠额外 env 手工脑补“这次报告到底是在测哪个模式”。

## 未纳入实现的尝试（已回退，不保留）

本轮曾试过两条内核微调，但 targeted perf 证据都显示负优化，因此没有保留到提交里：

- nonUrgent lane 的 host macrotask yield
- deferred time-slicing 的高精度时钟替换

裁决：`txnLanes` 这条线当前先把 **证据面做正确**，再继续做真正有收益的内核刀；不要把“负优化 tweak”硬塞进主线。

## 回归验证

- `pnpm -C packages/logix-react typecheck:test`
- `pnpm perf collect -- --profile quick --files test/browser/perf-boundaries/txn-lanes.test.tsx --out specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw100.txn-lanes-mode-matrix.targeted.json`

## 给后续 agent 的明确结论

- 以后看 `txnLanes.urgentBacklog`，先区分 `mode=default` 还是 `mode=off`，不要再把它们当成同一条线。
- 下一刀如果继续砍 `txnLanes`，应针对 `mode=default` 的真实路径做内核优化，而不是继续优化 suite 的隐式 forced-off 默认值。
