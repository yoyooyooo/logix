# PR Draft: refactor/logix-core-dispatch-pressure-source-20260224

- PR：`#51` https://github.com/yoyooyooo/logix/pull/51
- 合并策略：`auto-merge(rebase)` 已开启（等待 required checks）
- CI watcher：`.context/pr-ci-watch/pr-51-20260224-021215.log`

## 目标
- 提升 `logix-core` 核心 dispatch 链路的并发压力诊断可解释性：区分主 `actionHub` 与 topic fan-out 压力来源。
- 在不改变事务窗口/发布顺序/外部 API 的前提下，降低无压场景的诊断开销。

## 模块阅读范围
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.dispatch.ts`
- `packages/logix-core/src/internal/runtime/core/ConcurrencyDiagnostics.ts`
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts`
- `packages/logix-core/test/internal/Runtime/ConcurrencyPolicy/ConcurrencyPolicy.PressureWarning.test.ts`
- `packages/logix-core/test/internal/Runtime/ConcurrencyPolicy/ConcurrencyPolicy.DiagnosticsDegrade.test.ts`
- `packages/logix-core/test/internal/Contracts/Contracts.021.LimitUnboundedConcurrency.test.ts`
- `specs/021-limit-unbounded-concurrency/contracts/concurrency-diagnostic-details.schema.json`
- `docs/ssot/handbook/tutorials/19-concurrency-batching-txn-lanes.md`（对齐）

## 本轮改动
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.dispatch.ts`
  - `publishWithPressureDiagnostics` 改为接收 `trigger` thunk，只有检测到 `elapsedMs > 0` 时才构建 trigger 对象。
  - 将 action publish 路径拆成更细粒度诊断：
    - 主通道：`trigger.kind = actionHub`
    - topic fan-out：`trigger.kind = actionTopicHub`
  - 为诊断透出结构化来源信息（`dispatchEntry/channel/topicTag/fanoutCount/batchSize/actionTag`），并保持 dispatch/dispatchBatch/dispatchLowPriority 的原有业务语义。
- `packages/logix-core/src/internal/runtime/core/ConcurrencyDiagnostics.ts`
  - 在 `concurrency::pressure` 事件中透传 `inArgs.trigger.details` 到 `trigger.details.source`，与现有阈值/冷却统计字段并存。
  - `pressure cooldown` key 增加来源维度（`dispatchEntry/channel/topicTag/actionTag`），避免不同 topic 在同一 cooldown 键互相抑制。
  - `details.source` 先做 JSON 投影，避免非可序列化细节污染诊断契约。
- `packages/logix-core/test/internal/Runtime/ConcurrencyPolicy/ConcurrencyPolicy.PressureWarning.test.ts`
  - 现有 overload 用例增加断言：主通道压力事件需带 `source.channel = main`。
  - 新增 topic fan-out 压力用例：验证 `trigger.kind = actionTopicHub` 且 `source.channel/topicTag/fanoutCount` 正确。
- `packages/logix-core/test/internal/Runtime/ConcurrencyPolicy/ConcurrencyPolicy.DiagnosticsDegrade.test.ts`
  - 新增回归：`actionTopicHub/publish` 在不同 `topicTag` 下必须隔离 cooldown（同窗口内都可发出告警）。
- `specs/021-limit-unbounded-concurrency/contracts/concurrency-diagnostic-details.schema.json`
  - 合约新增可选 `source` 字段及其子结构（`dispatchEntry/channel/topicTag/actionTag/batchSize/fanoutCount`），保持 `additionalProperties: false`。
- `packages/logix-core/test/internal/Contracts/Contracts.021.LimitUnboundedConcurrency.test.ts`
  - 契约测试增加 `source` 对齐校验，并覆盖带 source 的 `concurrency::pressure` 事件。

## 验证
- `pnpm --filter @logixjs/core test -- test/internal/Runtime/ConcurrencyPolicy/ConcurrencyPolicy.PressureWarning.test.ts` ✅
- `pnpm --filter @logixjs/core test -- test/internal/Runtime/ConcurrencyPolicy/ConcurrencyPolicy.PressureWarning.test.ts test/internal/Runtime/ConcurrencyPolicy/ConcurrencyPolicy.DiagnosticsDegrade.test.ts test/internal/Contracts/Contracts.021.LimitUnboundedConcurrency.test.ts` ✅
- `pnpm --filter @logixjs/core test -- test/internal/Runtime/ConcurrencyPolicy/ConcurrencyPolicy.DiagnosticsDegrade.test.ts test/internal/Runtime/ConcurrencyPolicy/ConcurrencyPolicy.PressureWarning.test.ts test/internal/Contracts/Contracts.021.LimitUnboundedConcurrency.test.ts` ✅
- `pnpm typecheck` ✅
- `pnpm test:turbo` ✅

## 性能与诊断证据
- 无压场景优化：trigger 细节对象从“每次 dispatch 构建”改为“仅检测到 publish 等待时构建”。
- 诊断增强：`concurrency::pressure` 可区分主 `actionHub` 与 `actionTopicHub`，并携带 topic 维度来源字段，便于 Devtools/排障链路定位。
- 本地策略：按当前节奏仅做类型与测试门禁；性能回归由 PR CI 统一收敛。

## 独立审查
- Reviewer #1：subagent（`agent_id=019c8ba2-61e7-7911-ba09-988429133a0f`）
  - 初审结论：`不可合并`，阻塞项为 021 合约漂移（`details.source` 未纳入 schema）+ topic cooldown 维度过粗。
  - 处理：已补 schema 与契约测试；已将 cooldown key 扩展到 topic/source 维度并补回归。
- Reviewer #2：subagent（`agent_id=019c8ba9-ee2c-7393-a852-b78f640e03f3`）
  - 复审结论：无阻塞问题，`可合并`。
  - follow-up：根据复审低风险建议，已把 `details.source` 透传收敛为“仅接受对象型 JSON 投影”。

## 风险与回滚
- 风险：
  - 压力事件按更细粒度发射，理论上在极端拥塞下诊断事件维度会增加（冷却仍生效）。
  - `pressure` 计时从“整段 publish”细化为“单次 publish”，历史阈值观察口径会更偏向局部阻塞；已通过 `source` 细节补偿可解释性。
- 回滚：
  - 回退 `ModuleRuntime.dispatch.ts` 的分通道 trigger 与 `ConcurrencyDiagnostics.ts` 的 `details.source` 透传；
  - 同步回退 021 schema 与契约测试中 `source` 扩展。

## 机器人评论消化（CodeRabbit）
- 待 PR 创建后补充。
