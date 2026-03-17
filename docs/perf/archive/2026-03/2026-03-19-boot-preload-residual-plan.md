# 2026-03-19 · boot/preload residual 最小实验包（唯一下一线）

## 结论类型

- `docs/spec-only`
- `future-only minimal experiment package`

## 目标与范围

目标：针对 boot/preload residual 给出一份可直接实施的最小实验包，产出唯一下一线，包含明确的实现落点、证据闭环、成功门与失败门。

范围：

- 本 worktree 只落盘文档，不写代码。
- 实施将触碰 `packages/logix-react/src/internal/provider/RuntimeProvider.tsx`，该文件在本 worktree 属于禁区，只在实施线改动。
- 该实验包默认和 `P1-6'` 同路径，优先合并到 `P1-6'` 实施线执行。

## 当前基线与前置假设

前置：`P1-6 v2` 与 `P1-7'` 已吸收，`Current-Head Fresh Reprobe Wave5` 为 `clear_stable`。

本实验包处理的 residual 属于未来线，不以“当前 probe 是否 blocked”作为启动条件。启动条件由实施线自行裁决，建议优先在出现 `bootToReady` 回弹或 `trace:react.runtime.config.snapshot(mode=async)` 异常增多时触发。

## 唯一下一线

题目：`sync-ready neutral lane` 移除 boot 期默认 async config confirm，保留 ready 期一次性 refresh 窗口。

直觉：当前 `RuntimeProvider` 在 render 期已拿到 sync snapshot，且 `loaded=true` 的情况下，仍会在 effect 中触发一轮 `ReactRuntimeConfigSnapshot.load`，带来 boot 控制面额外探测与 trace 噪声，并放大后续 `deferPreloadPlan` 的重算机会。

这条线只改一个判定条件，不改 singleflight 语义，不改 `owner + lane + phase` 的 token 口径。

## 明确排除项

以下切口禁止重做或已失败，本实验包不触碰：

- `boot-epoch config singleflight`，已有 owner conflict 结论，见 `docs/perf/archive/2026-03/2026-03-17-p1-6-boot-config-owner-conflict.md`。
- `RAF/readSync scope-make fastpath`，已被记录为失败切口。
- 旧 `neutral-config singleflight`，不回到旧题目与旧口径。
- `defer preload unresolved-only continuation`，已有失败记录，见 `docs/perf/archive/2026-03/2026-03-15-v4-perf-wave1-status.md` 中的 `P1-6 react defer preload unresolved-only`。

## 变更草图

实现落点：`packages/logix-react/src/internal/provider/RuntimeProvider.tsx` 的 config confirm effect。

当前关键逻辑包含：

- render 期 sync snapshot 加载，成功后会将 `configState.loadMode='sync'`，并在满足条件时将 `loaded=true`。
- effect 期 async confirm 的触发条件 `shouldRunAsyncConfigConfirm`。
- resolve token 已按 `owner + lane + phase` 固化，`neutral` 与 `config` lane 已分轨。

最小变更建议：

- 调整 `shouldRunAsyncConfigConfirm` 的判定，把 sync-ready 的 boot 期路径挡掉。
- 方案选择为“只允许在 ready 期触发一次 neutral lane refresh”，避免 boot 期默认 async confirm。

可执行的判定形状示例：

- `configState.loadMode !== 'sync'` 时保持原行为。
- `bootConfigOwnerLocked === true` 时保持原行为。
- `configState.syncOverBudget === true` 时保持原行为。
- `configState.loadMode === 'sync'` 且满足上面三条都为 false 时，只在 `providerReadyAtRef.current !== undefined` 的窗口允许一次 async confirm。

实现后预期变化：

- `loadMode=sync` 且 `bootConfigOwnerLocked=false` 的常见路径，不再出现 `lane=neutral phase=boot` 的 async snapshot trace。
- `loadMode=sync` 仍保留一次 `lane=neutral phase=ready` 的 refresh 窗口，用于吸收“ready 附近的配置变更”正确性需求。

## 证据闭环与验收门

成功门：

- `runtime-bootresolve-phase-trace` 相关用例能稳定证明：sync-ready neutral lane 不再产生 boot 期 async snapshot trace。
- `reactConfigRuntimeProvider` 相关用例能稳定证明：config-bearing 路径的首个 ready render 正确性不回归。
- `probe_next_blocker` 不新增 blocker。
- focused bench 允许零收益，禁止出现确定性回归。建议以 `bootToReady` 和 `deferReady` 的中位数与分位数作为判定指标。

失败门：

- 触发 `boot-epoch config singleflight` 的语义回摆。
- 触发 `unresolved-only` 旧线的语义回摆。
- 触发 config-bearing 首屏正确性回归。

## 与 P1-6' 的关系裁决

这条线和 `P1-6'` 的改动区重叠度高，且核心落点在 `RuntimeProvider` 的 config resolve 控制面。

建议裁决：

- 默认并入 `P1-6'` 实施线执行，避免并行改同一段状态机导致的冲突与证据漂移。
- 仅当 `P1-6'` 已结束且确认不再触碰该段逻辑时，再单开独立实施线。

