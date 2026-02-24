# RuntimeStore listener callback fast-path（PR10）

## Branch
- `refactor/logix-core-perf-pr10-runtime-store-listener-callback`
- PR: #77 (https://github.com/yoyooyooo/logix/pull/77)
- CI watcher: `.context/pr-ci-watch/pr-77-20260224-175813.log`

## 核心改动
- `packages/logix-core/src/internal/runtime/core/RuntimeStore.ts`
  - `commitTick` 增加可选 `onListener` callback fast-path。
  - 提供 callback 时直接分发 listener，避免构建 `changedTopicListeners` 中间数组。
  - 不提供 callback 时保持旧返回结构兼容。
- `packages/logix-core/src/internal/runtime/core/TickScheduler.ts`
  - 切换为 callback 路径触发 listener，并保留 `try/catch` best-effort 语义。

## 测试覆盖
- `packages/logix-core/test/internal/Runtime/RuntimeStore.listenerSnapshot.test.ts`
  - 新增 callback fast-path 回归，验证通知顺序与 tick 内订阅变更隔离。
  - 保留旧路径断言，确保兼容。

## 验证
- `pnpm typecheck`
- `pnpm test:turbo`

## 独立审查
- 本 PR 由独立 worker subagent 在独立 worktree 实施并自验证后提交。
- 独立只读审查初版发现 blocker（同 tick 跨 topic 订阅隔离回归）与 callback 异常中断风险，已修复并补测试（提交 `34d6fc13`）：
  - `commitTick` callback fast-path 改为“两阶段”（先收集快照，再统一回调），恢复旧语义；
  - callback 内部 best-effort 防护，单 listener 异常不打断 commit；
  - 新增多 topic 同 tick 与 callback 抛错场景回归测试。
