# PR Draft: refactor/logix-core-flowruntime-op-context-20260224

## 目标
- 优化 `FlowRuntime` 热路径，避免在 `run*` 的每个 payload 上重复解析 middleware stack 与 RunSession 服务。
- 保持 `flow.run / runParallel / runLatest / runExhaust` 的行为与诊断语义不变。

## 模块阅读范围
- `packages/logix-core/src/internal/runtime/core/FlowRuntime.ts`
- `packages/logix-core/test/internal/Flow/FlowRuntime.test.ts`

## 本轮改动
- `packages/logix-core/src/internal/runtime/core/FlowRuntime.ts`
  - 新增 `FlowOpContext` 与 `resolveFlowOpContext()`，集中解析 `EffectOpMiddlewareTag` 与 `RunSessionTag`。
  - `runAsFlowOp(...)` 改为接收预解析 context，payload 执行阶段直接复用 `context.stack/context.session`。
  - `run/runParallel/runLatest/runExhaust` 在每次调用入口先解析一次 context，后续 payload 不再重复读取 middleware/session。
- `packages/logix-core/test/internal/Flow/FlowRuntime.test.ts`
  - 新增回归：`run* should read middleware stack once per invocation instead of per payload`。
  - 通过 getter 计数验证四类 `run*` 调用都只读取一次 middleware stack。

## 验证
- `pnpm --filter @logixjs/core test -- test/internal/Flow/FlowRuntime.test.ts` ✅
- `pnpm --filter @logixjs/core typecheck:test` ✅
- `pnpm typecheck` ✅
- `pnpm test:turbo` ✅

## 性能与诊断证据
- 优化点位于 `FlowRuntime` 的高频 payload 执行路径，核心收益是消除每 payload 的 `serviceOption`/stack 读取开销。
- 诊断与事件协议无新增字段；`flow::unhandled_failure`、`opSeq` 生成、并发策略解析路径保持不变。

## 独立审查
- 实施：worker subagent（`agent_id=019c8e71-800a-7bf1-b426-d8c0f1d8545b`）
- 复审：explorer subagent（`agent_id=019c8e7b-06cc-7de2-acdc-88de2cbb8060`）
- Blocking findings：无
- Non-blocking suggestions：
  - 确认“middleware 只在 Flow 入口读取一次”是可接受语义（避免误解为 payload 级动态注入）。
  - 后续可补 `opSeq` 连续递增的专项回归。
- Verdict：可合并

## 风险与回滚
- 风险：若存在依赖“payload 级动态替换 middleware 环境”的非常规用法，新策略会改为流级快照。
- 回滚：撤销 `FlowOpContext` 预解析，将 middleware/session 读取恢复到 `runAsFlowOp` 内 per-payload 路径。

## 机器人评论消化（CodeRabbit）
- 已获取 PR #69 评论流：CodeRabbit 命中 hourly rate limit（需等待约 8m49s），当前暂无可执行审查建议。
- 处理策略：限流窗口后触发  review 或在后续提交后继续自动审查，并在出结论后补充“采纳/暂不采纳+理由”。
