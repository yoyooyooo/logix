# PR Draft: refactor/logix-core-dispatch-analysis-fastpath-20260224

- PR：`#73`（https://github.com/yoyooyooo/logix/pull/73）
- 分支：`refactor/logix-core-perf-pr6-dispatch-analysis-fastpath`
- task-key：`logix-core/module-runtime/dispatch-analysis-fastpath`

## 目标
- 收敛 `ModuleRuntime.dispatch` 热路径中的 action 分析重复开销。
- 保持 action topic fanout 与 dispatch 诊断语义不变的前提下，去掉 `_tag/type` 重复 topic 的二次发布噪音。

## 模块阅读范围
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.dispatch.ts`
- `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.test.ts`

## 本轮改动
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.dispatch.ts`
  - 新增 `ActionAnalysis` 与 `analyzeAction(action)`，将 `_tag/type` 解析、归一化 actionTag、origin op 推断统一在一次分析中完成，并在 dispatch / batch / lowPriority 链路复用。
  - primary reducer、debug action 记录、txn origin details 均改为消费预分析结果，减少重复字段解析与字符串判定。
  - topic fanout 改为 primary/secondary 两路显式发布，并基于 `_tag/type` 去重，避免同 topic 重复 publish。
  - batch fanout 保持按原始 action 顺序逐条发布，语义与顺序兼容。
- `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.test.ts`
  - 新增回归：`actionsByTag$ should dedupe duplicated _tag/type topic fanout`，锁定 `_tag` 与 `type` 相同场景下只会收到一次 topic action。

## 验证
- `pnpm typecheck` ✅
- `pnpm test:turbo` ✅

## 风险与结论
- 风险：
  - dispatch 现在依赖预分析结果，后续若扩展 action tag 来源，需要同步更新 `analyzeAction`（单点职责更明确，但单点变更风险更集中）。
- 结论：
  - 当前实现保持原有 OR 语义与 batch 顺序语义，同时去除了重复 topic fanout，符合本轮 fastpath 目标。

## 机器人评论消化（CodeRabbit）
- 待 CI 与 review comments 到位后补充。
