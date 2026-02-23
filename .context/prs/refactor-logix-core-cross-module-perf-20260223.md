# PR Draft: refactor/logix-core-cross-module-perf-20260223

## 目标
- 优化跨模块核心链路的热路径开销：`StateTransaction.commit -> ModuleRuntime.transaction -> Process moduleStateChange`。
- 在不改变功能与测试语义的前提下，减少提交后的冗余读取与 moduleStateChange 的重复 selector 评估。

## 模块阅读范围
- `packages/logix-core/src/internal/runtime/core/StateTransaction.ts`
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts`
- `packages/logix-core/src/internal/runtime/core/process/triggerStreams.ts`
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts`
- `packages/logix-core/src/internal/runtime/core/SelectorGraph.ts`
- `packages/logix-core/test/Process/Process.Trigger.ModuleStateChange.test.ts`
- `packages/logix-core/test/Process/Process.Trigger.ModuleStateChange.SelectorDiagnostics.test.ts`
- `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.test.ts`

## Spec 对齐（灵感来源）
- `docs/ssot/handbook/tutorials/03-transactions-and-tick-reference-frame.md`：commit 后 selector/tick 链路约束。
- `docs/ssot/runtime/logix-core/impl/README.09-statetransaction-devtools.md`：单事务单提交与观测边界。
- `specs/000-module-traits-runtime/spec.md`（FR-022）：一次逻辑入口对应单事务聚合提交。

## 本轮改动
- `StateTransaction.ts`
  - 新增 `commitWithState`：提交后返回 `{ transaction, finalState }`。
  - 既有 `commit` 保持签名不变，改为复用 `commitWithState` 并返回 `transaction`。
- `ModuleRuntime.transaction.ts`
  - 提交路径改为使用 `commitWithState` 的 `finalState`，移除提交后 `SubscriptionRef.get(stateRef)` 回读。
- `process/triggerStreams.ts`
  - `moduleStateChange` 在非诊断路径改为 `runtime.changesReadQueryWithMeta(ReadQuery.make(...))` 静态 lane，复用 `SelectorGraph` 缓存与增量通知。
  - 诊断开启路径继续保留原有 `changesWithMeta(selector)` + sampling/warning 逻辑，语义不变。
  - 增加运行时能力兜底：若不存在 `changesReadQueryWithMeta` 则回退旧路径。
- `Process.Trigger.ModuleStateChange.test.ts`
  - 新增回归用例：`should ignore commits when unrelated paths change`。
- `ModuleRuntime.test.ts`
  - 新增回归用例：`StateTransaction.commitWithState should stay semantically equivalent to commit`。
  - 新增回归用例：`StateTransaction.commit and commitWithState should both keep 0-commit semantics`（`Object.is` 引用语义）。

## 验证
- `pnpm typecheck`
- `pnpm test:turbo`

## 独立审查
- 审查方式：1 个独立 subagent（explorer，`agent_id=019c8913-60ca-7480-bfa1-d301eaf46445`）基于相对 `origin/main` 的 diff 做只读审查。
- 结论：无阻塞问题，可合并。
- 非阻塞建议（留作后续）：
  - fallback 路径（无 `changesReadQueryWithMeta`）首个无关提交可能误触发一次，可考虑订阅前初始化 `prevRef`。
  - 可补“off 模式显式走 readQuery 通道”的实现约束测试（当前已有功能回归覆盖）。

## 风险与关注点
- `commitWithState` 为内部性能接口，需确保外部仍仅依赖 `commit` 的稳定语义。
- `moduleStateChange` 切到 static readQuery 后，需持续关注：
  - 非相关路径提交不触发；
  - 诊断开启时告警行为不漂移（当前通过保留旧路径规避）。
