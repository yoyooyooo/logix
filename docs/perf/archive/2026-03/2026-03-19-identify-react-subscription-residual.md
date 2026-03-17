# 2026-03-19 · identify react subscription/render residual（read-only）

## 范围与前提

- 只读识别，不做实现。
- 识别基线：
  - `docs/perf/archive/2026-03/2026-03-17-p1-5-closeout.md`
  - `docs/perf/archive/2026-03/2026-03-19-reactbridge-cleanup.md`
  - `docs/perf/archive/2026-03/2026-03-19-crossplane-cleanup.md`
- 当前前提：`current-head` 为 `clear`，本次属于 future-only 候选排序。

## Top2（future-only）

### Top1：按组件实例做 selector listener multiplexing（压缩同 topic 的回调扇出税）

识别依据：

- `useSelector` 已共享同一个 runtime topic 订阅源，但每个 hook 仍各自注册 listener。
  - `packages/logix-react/src/internal/hooks/useSelector.ts`
  - `packages/logix-react/src/internal/store/RuntimeExternalStore.ts`（`listeners: Set<() => void>` + `flushNotify` 全量遍历）
- 现有测试证明了“runtime 订阅次数不随 selector 数增长”，但未压掉“每次通知的 listener 回调次数”：
  - `packages/logix-react/test/Hooks/useSelector.sharedSubscription.test.tsx`

残余税形态：

- 单组件 `N` 个 `useSelector` 命中同 topic 时，commit 后仍是 `O(N)` listener 回调和 selector compare。
- render 次数可保持稳定，notify 常数仍线性放大。

正面收益：

- 直接命中 React 订阅链剩余常数项，尤其是“单组件多 selector”场景。
- 不需要重开 `SelectorGraph` 或 process 面的大改造。

反面风险：

- 需要引入组件级 selector 路由表，`StrictMode` mount/unmount 抖动下的订阅生命周期需额外验证。
- 若聚合粒度设计不当，可能影响 selector-level 诊断颗粒度。

API 变动可能性：

- 低。预期只改 internal bridge/hook 组织方式。

---

### Top2：提升 selectorTopicEligible 覆盖率（降低 module-topic 回退带来的重算/回调税）

识别依据：

- 只有 `lane=static + readsDigest 存在 + fallbackReason 为空` 才走 readQuery topic 细粒度订阅：
  - `packages/logix-react/src/internal/hooks/useSelector.ts`
- 其余 selector 会回退到 module topic，状态提交后仍会触发 selector 重算路径。
- `ReadQueryBuildGate` 已有 fallback 质量统计基础，可作为“回退比例”观测口径：
  - `packages/logix-core/src/internal/runtime/core/ReadQueryBuildGate.ts`

残余税形态：

- fallback selector 在高频 commit 下触发无差别通知，额外放大 compare 与 render 前计算。

正面收益：

- 命中更大覆盖面，收益可横跨 React facade 与核心 selector 管线。
- 与 `P1-5` 的 retention 收口互补，继续压缩“订阅后每次 commit 的执行税”。

反面风险：

- 需要跨 `ReadQuery` 质量门与 `useSelector` 路由策略联动，验证面大于 Top1。
- 过于激进地提升静态化可能引入语义漂移风险。

API 变动可能性：

- 中。若要把 fallback 预算或策略暴露到配置层，可能触及对外约定。

## 唯一建议下一线

- `Top1：按组件实例做 selector listener multiplexing`

原因：

1. 命中 React subscription/render residual 的直接税点，链路短，证伪快。
2. 与 `P1-5`、reactbridge cleanup、crossplane cleanup 均不冲突，可独立取证。
3. 对 public API 影响最小，适合 current-head `clear` 阶段的 future-only 小步试探。

## 是否建议后续开实施线

- 建议开一条实施线（单线，先做 Top1）。
