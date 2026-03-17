# 2026-03-16 · P0 existing-link inline operation fast path pending

## 背景

`agent/v4-perf-op-snapshot` worktree 留下一份未提交实验，只改了：

- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.operation.ts`

这份 diff 试图把 `runOperation(...)` 再往前推一层 inline fast path。

命中的目标路径是：

- `middlewareStack.length === 0`
- 当前 fiber 已有 `linkId`

核心做法：

1. 把显式 `opSeq` 读取拆成 helper
2. 把 `runSession.local.nextSeq(...)` 分配拆成 helper
3. 当满足窄条件时，直接 `provide currentOpSeq/currentLinkId` 后返回 effect，跳过 `baseMeta` 组装与 `EffectOp.make(...)`

## 静态判断

性能方向有意义，但范围很窄。

它确实在压这条热路径：

- 嵌套 operation
- 空 middleware
- 已有 linkId

理论收益点也清楚：

- 少掉 `EffectOp.make(...)`
- 少掉 `id/meta` 组装
- 少掉一层公共 effect-op 外壳

但语义边界没有被当前 worktree 收口。

主要风险点：

1. 在 `existingLinkId + 无 runSession + 无显式 opSeq` 时，新路径会把 `currentOpSeq` 置为 `undefined`
2. 旧路径下 `EffectOp.make(...)` 仍会兜底生成全局单调 `opSeq/id`
3. 当前脏 diff 没有配套守门测试，也没有配套 perf 证据 note

## 与当前母线的关系

这条线没有被直接回收。

原因：

1. 母线已经收口了更小、更可证的正式方案：
   - `2026-03-15-p0-2-operation-runner-fast-snapshot.md`
   - `2026-03-16-p0-runsession-local-opseq-fast-path.md`
2. 这份未提交实验与后续正式方案关注的是同一片 operation 热路径，但边界更冒进
3. 当前没有新增硬证据证明它比已接受方案更值得保留

## 证据状态

本轮只有静态 diff 审阅，没有新增 perf 证据。

尝试在实验 worktree 直接跑目标 Vitest 时，进程在本机 `system-configuration` 层 panic，未拿到可比输出。

因此当前不能把它归为 `accepted_with_evidence`。

## 当前裁决

- 结果分类：`discarded_or_pending`
- 不回收代码
- 只保留 docs/evidence-only note
- `agent/v4-perf-op-snapshot` 的 source worktree 已在后续清理中恢复到分支 `HEAD`
- 后续若继续这条方向，必须从当前母线重新拉独立实验线，而不是复用旧 worktree 的脏改动

## 若未来重开

只能从当前母线重新开独立实验线，并先补齐三类守门：

1. `existingLinkId + 无 runSession` 时 `currentOpSeq` 的目标语义
2. `existingLinkId + runSession` 下 `opSeq` 的单调性与 `instanceId` 隔离
3. 动态 `resolveOperationRuntimeServices()` 路径是否仍有稳定收益

在这三件事没补齐前，不建议继续保留这份脏 diff。
