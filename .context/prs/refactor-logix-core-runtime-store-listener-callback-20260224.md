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

## 性能与诊断证据
- 性能基线来源：现有 `logix-perf (quick)` 工件（run `22347235192`，artifact `logix-perf-quick-76`，workflow `logix-perf-quick.yml`）。
- 可比性结论：`comparable=true`，`regressions=0`，`improvements=0`，`head budgetExceeded=0`（base `6ce82285` -> head `f0a3bfc1`）。
- 复现方式：
  - 查看 workflow 日志与 summary：`gh run view 22347235192 --log`
  - 下载工件并读取 `summary.md` / `diff.*.json`：`gh run download 22347235192 -n logix-perf-quick-76 -D /tmp/logix-perf-quick-76`
- 诊断/Devtools 影响：本轮未新增诊断事件或 Devtools 协议字段；仍沿用 `TickScheduler` 既有 `trace:tick`/`warn:*` 事件链路，仅调整 listener 分发实现。

## 独立审查
- 本 PR 由独立 worker subagent 在独立 worktree 实施并自验证后提交。
- 独立只读审查初版发现 blocker（同 tick 跨 topic 订阅隔离回归）与 callback 异常中断风险，已修复并补测试（提交 `34d6fc13`）：
  - `commitTick` callback fast-path 改为“两阶段”（先收集快照，再统一回调），恢复旧语义；
  - callback 内部 best-effort 防护，单 listener 异常不打断 commit；
  - 新增多 topic 同 tick 与 callback 抛错场景回归测试。

## 机器人评论消化（CodeRabbit）
- 评论 1（`.context/prs/...`）：要求补性能基线/测量与诊断说明。
  - 处理：`已采纳`。补充 `perf-quick` 工件引用、可比性结论、复现命令与“无新增诊断协议字段”说明（见“性能与诊断证据”）。
- 评论 2（`.context/REFACTOR.md`）：`#TBD` 需改为 `#77`。
  - 处理：`已采纳`。索引已固定为 `PR #77`，并在 merge 冲突消解后再次核对无 `#TBD` 残留。
- 评论 3（`.context/REFACTOR.md`）：详细记录缺少性能证据（与评论 1 同主题）。
  - 处理：`已采纳（合并处理）`。不新增基准脚本，直接引用现有 `perf-quick` 工件并补齐方法学与结论。
- 评论 4（`RuntimeStore.ts`）：callback fast-path 需两阶段快照+分发，避免同 tick 跨 topic 订阅可见性回归。
  - 处理：`不采纳新增改动`。当前实现已是“两阶段”（先收集 `changedTopicSnapshots`，再统一 callback 分发），并有 `RuntimeStore.listenerSnapshot.test.ts` 的跨 topic 回归用例覆盖。
- Vercel：免费额度限制失败（非代码语义问题）。
