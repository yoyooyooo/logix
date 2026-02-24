# FlowRuntime effect resolver 预解析快路径（PR17）

## Branch
- `refactor/logix-core-perf-pr17-flowruntime-resolver-fastpath`
- PR: `#84` (https://github.com/yoyooyooo/logix/pull/84)

## 核心改动
- `packages/logix-core/src/internal/runtime/core/FlowRuntime.ts`
  - 增加 `preResolveEffectResolver`，在 `run*` 创建阶段预解析 effect resolver，避免每个 payload 重复 `typeof` 分支判断。
  - 抽取共享 mapper，复用 `runAsFlowOp` 调用路径，降低闭包分配。
  - `run/runParallel/runLatest/runExhaust` 语义保持不变。
- `packages/logix-core/test/internal/Flow/FlowRuntime.test.ts`
  - 新增静态 effect 输入回归，覆盖四种 run 模式语义一致性。

## 验证
- `pnpm typecheck`
- `pnpm test:turbo`

## 独立审查
- 审查 agent：`019c8fbe-8ef8-7aa2-a536-ffba2caad357`（只读）
- 结论：`no blocking findings`
- 非阻塞建议：
  - `FlowRuntime.test.ts` 新增用例可后续统一迁移到 `it.effect/it.scoped` 风格；
  - 补充 perf 证据与诊断影响结论到 PR 文档。

## 机器人评论处理
- CodeRabbit: 待 PR 创建后拉取评论并回填。
- Vercel: 仅部署额度提示（若出现）按非代码质量事件记录。
