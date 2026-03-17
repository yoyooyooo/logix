# 2026-03-22 · P1-4F-min core->react single pulse contract（not-ready，docs/evidence-only）

## 目标与范围

- worktree：`/Users/yoyo/Documents/code/personal/logix.worktrees/v4-perf.p1-4f-single-pulse-contract`
- branch：`agent/v4-perf-p1-4f-single-pulse-contract`
- 本轮目标：尝试把 `RuntimeStore -> RuntimeExternalStore` 收敛到“每 module 每 tick 单脉冲输入 + 单订阅路径”的最小切口。
- 本轮实际收口：`docs/evidence-only`，不保留 `packages/**` 实现改动。

## 结论

- 结果分类：`discarded_or_pending`
- 当前裁决：`P1-4F` 在本轮仍 `not-ready`，不进入实现阶段。
- 代码状态：无 `packages/**` 改动，未留下半成品实现。

## 主要 blocker

1. `TickScheduler` 的 selector active contract 仍绑定 `readQuery subscriber count`。  
   `onSelectorChanged` 的 dirty 标记门控依赖 `getReadQuerySubscriberCount`，当前缺少与 module-level pulse 订阅对齐的 selector interest 合同。

2. `RuntimeExternalStore` 的 readQuery activation retain 生命周期仍在旧路径。  
   `retainReadQueryActivation` 的启停时机仍围绕 readQuery store 首尾监听器与 grace teardown，尚未迁移到 module-level 单订阅路径的生命周期模型。

3. `useSelector` 的单订阅路径合同未定。  
   目前复用粒度仍是 `componentOwner + store`，缺少“同 module 下多 selector 共享单订阅输入”的最终合同定义与验证门。

## 为什么本轮停在 docs/evidence-only

- 若直接实现，需要同时改动 core/react 多处内部合同，最小切口边界当前不稳定。
- 若继续硬落代码，漏通知风险与验证噪声风险都偏高，无法形成可比结论。

## 下一步前置条件

1. 明确 selector interest contract：从 `readQuery subscriber count` 迁移到与 module single pulse 对齐的门控口径。  
2. 明确 readQuery activation retain 的新生命周期：首尾订阅、grace 窗口、teardown 时机要可证明无漂移。  
3. 明确 `useSelector` 单订阅路径合同与最小验证矩阵：至少覆盖 shared-subscription、low-priority、无漏通知断言。

## 交叉引用

- 上游 scout：`docs/perf/2026-03-22-crossplane-single-pulse-contract-nextwide-scout.md`
- 相关实现基线：
  - `docs/perf/2026-03-21-p1-4c-min-pulse-envelope-selector-delta-impl.md`
  - `docs/perf/2026-03-22-p1-4d-min-single-path-cleanup.md`
- 证据落点：
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-22-p1-4f-min-single-pulse-contract-not-ready.summary.md`
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-22-p1-4f-min-single-pulse-contract-not-ready.evidence.json`
