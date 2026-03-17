# 2026-03-19 · identify boot/preload residual（post P1-6 + P1-6 v2 + P1-7，read-only）

## 结论类型

- `docs/evidence-only`
- `future-only residual identification`

## 唯一下一线指向

唯一下一线的最小实验包已落盘，见：

- `docs/perf/archive/2026-03/2026-03-19-boot-preload-residual-plan.md`

## 输入与边界

- 本 note 只做只读识别，不做实现。
- 识别前提：`P1-6 / P1-6 v2 / P1-7` 已吸收到母线，`current-head` 当前按 `clear_stable` 解读。
- 关键证据：
  - `docs/perf/archive/2026-03/2026-03-19-p1-6-owner-aware-resolve-v2.md`
  - `docs/perf/archive/2026-03/2026-03-19-p1-7-provider-singleflight.md`
  - `docs/perf/archive/2026-03/2026-03-19-current-head-reprobe-wave5.md`
  - `packages/logix-react/src/internal/provider/RuntimeProvider.tsx`
  - `packages/logix-react/src/internal/store/ModuleCache.ts`

## top2（future-only）

### Top1 · boot config resolve 的“sync 已就绪路径”按需化（去掉默认 async confirm）

定义：
- 在 `RuntimeProvider` 中，针对 `loadMode=sync` 且 `bootConfigOwnerLocked=false` 的路径，避免默认再跑一次 async config snapshot confirm。
- 把“是否需要 ready-phase async refresh”改成显式触发条件，而不是默认触发。

为何仍是 residual：
- `P1-6/P1-7` 已完成 owner/lane/phase 分轨，正确性和冲突主线收敛。
- 当前实现仍在 effect 中默认发起 async config load，哪怕 sync 快照已可直接放行，boot 期仍有额外控制面探测税。

正面收益：
- 进一步压低 boot 控制面固定税，减少一次默认 async snapshot 读与相关 trace 噪声。
- 对 `policy.syncBudgetMs` 足够、且非 config-bearing 的常见路径更直接。

反面风险：
- 若触发条件定义过窄，可能延后配置刷新可见性。
- 需要补齐“sync 首屏正确性 + ready 后配置变化”组合场景回归。

API 变动：
- `低`，以内部控制面规则调整为主。

最小验证命令：
```bash
pnpm --filter @logixjs/react exec vitest run test/RuntimeProvider/runtime-bootresolve-phase-trace.test.tsx --pool forks
pnpm --filter @logixjs/react exec vitest run test/internal/integration/reactConfigRuntimeProvider.test.tsx --pool forks
python3 fabfile.py probe_next_blocker --json
```

### Top2 · defer preload 从“全量 plan 扫描”收敛到 unresolved-only continuation

定义：
- 在 `defer+preload` 路径，把当前 render/effect 的全量 plan 扫描与重复调度，收敛成 unresolved-only 的 continuation 机制。
- 目标是只推进尚未完成的 preload entry，减少每轮全量 warm/probe。

状态：
- 已有失败记录，后续不作为默认下一线，见 `docs/perf/archive/2026-03/2026-03-15-v4-perf-wave1-status.md` 中的 `P1-6 react defer preload unresolved-only`。

为何仍是 residual：
- `P1-6` 已把 render/effect 的 preload 解析统一为单 plan，主冲突已解。
- 当前 `syncWarmPreloadReady` 与 effect preload 仍基于全量 entry 驱动，存在可继续压缩的控制面壳税。

正面收益：
- 大 preload 列表场景下可减少 boot 期重复探测与调度抖动。
- 有利于降低 `defer` 模式 fallback 时长尾波动。

反面风险：
- continuation 状态机更复杂，取消/retain/handoff 边界更容易回归。
- 若 unresolved 判定不稳，可能导致个别 entry 饥饿或重复预热。

API 变动：
- `低到中`，优先内部实现；若暴露 continuation 可观测语义，文档口径需更新。

最小验证命令：
```bash
pnpm --filter @logixjs/react exec vitest run test/internal/integration/runtimeProviderDeferPreloadPlan.test.tsx --pool forks
pnpm --filter @logixjs/react exec vitest run test/internal/store/ModuleCache.preload.test.ts --pool forks
pnpm --filter @logixjs/react exec vitest run test/integration/runtimeProviderSuspendSyncFastPath.test.tsx --pool forks
```

## 唯一建议下一线

- `Top1`：boot config resolve 的“sync 已就绪路径”按需化（去掉默认 async confirm）。

理由：
1. 变更面最小，主要集中在 `RuntimeProvider` config resolve effect 条件。
2. 与 `P1-6/P1-7` 已吸收语义连续，复用现有测试资产，证伪速度快。
3. 对 boot residual 的收益更直接，且 API 风险低于 preload continuation 重排。

## 开线建议

- 建议后续开实施线：`是`（触发器允许时）。
