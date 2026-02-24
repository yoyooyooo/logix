# RuntimeStore listener snapshot cache（PR14）

## Branch
- `refactor/logix-core-perf-pr14-runtime-store-listener-snapshot-cache`
- PR: `#81` (https://github.com/yoyooyooo/logix/pull/81)

## 核心改动
- `packages/logix-core/src/internal/runtime/core/RuntimeStore.ts`
  - 在 `commitTick` 中新增单 topic 快路径：仅一个 dirty topic 时复用 `listenerSnapshot(topic)`，避免 `flatMap + Array.from` 扁平化分配。
  - 多 topic 仍保留原语义路径，保证同 tick 快照隔离与 flush 行为不变。

## 测试覆盖
- `packages/logix-core/test/internal/Runtime/RuntimeStore.listenerSnapshot.test.ts`
  - 覆盖单 topic 快路径与多 topic 合并路径，确认快照隔离与回调顺序语义保持。

## 验证
- `pnpm typecheck`
- `pnpm test:turbo`

## 独立审查
- 第一轮审查 agent：`019c8f7b-b7f4-74d3-8da5-47aacf4f0c70`（只读审查）
- 审查结论：`needs changes`（Major）
  - 指出快路径仅覆盖无 `onListener` 分支，TickScheduler 热路径始终传 `onListener`，收益不可达。
- 修复动作：worker agent `019c8f80-09da-7231-b291-9719a84a34c3` 已补 `onListener` 分支同等快路径并 push
  - 修复提交：`0af19941` (`perf(logix-core): fast-path listener callback commit for single-topic ticks`)
  - 验证：`pnpm typecheck`、`pnpm test:turbo` 通过

## 机器人评论处理
- CodeRabbit：已拉取评论（2026-02-24 11:47 UTC），内容为 rate-limit 提示，无有效语义评论；本轮无需代码改动。
- `logix-perf (quick)`：已完成，`status: ok`，无回归。
- Vercel：部署额度限制失败（`api-deployments-free-per-day`），非代码质量问题。
