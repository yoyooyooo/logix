# FlowRuntime invocation 级上下文缓存（PR11）

## Branch
- `refactor/logix-core-perf-pr11-flowruntime-op-context-cache`
- PR: `TBD`

## 核心改动
- `packages/logix-core/src/internal/runtime/core/FlowRuntime.ts`
  - `run/runParallel/runLatest/runExhaust` 改为 invocation 级解析 `middleware stack + run session`。
  - payload 处理阶段复用已解析上下文，减少高频 `getMiddlewareStack/serviceOption(RunSessionTag)` 开销。
  - 保持 `opSeq/linkId` 语义不变。

## 测试覆盖
- `packages/logix-core/test/internal/Flow/FlowRuntime.test.ts`
  - 新增回归：四类 `run*` 每次 invocation 对 `stack` 与 run session `local` 只读取一次。

## 验证
- `pnpm typecheck`
- `pnpm test:turbo`

## 独立审查
- 本 PR 由独立 worker subagent 在独立 worktree 实施并自验证后提交。
