# Debug ring buffer 写入 O(1) 化

## Branch
- refactor/logix-core-perf-pr4-debug-ring-buffer
- PR: #70 (https://github.com/yoyooyooo/logix/pull/70)

## 核心改动
- `packages/logix-core/src/Debug.ts`
  - `makeRingBufferSink` 从 `Array.shift()` 队列改为定长环形缓冲（head + size），写入路径 O(1)
  - `getSnapshot()` 保持“最旧 -> 最新”有序输出
  - `clear()` 保持语义不变；`capacity<=0` 继续忽略写入
- `packages/logix-core/test/Debug/Debug.test.ts`
  - 补充容量溢出后的有序窗口断言（多次 overflow）
  - 补充 `clear()` 后窗口重启断言
  - 补充 `capacity<=0` 不记录事件断言

## 验证
- pnpm typecheck
- pnpm test:turbo

## 独立只读审查（2026-02-24）
- Blocker：无
- Non-blocker：
  - `packages/logix-core/src/Debug.ts` 的 `makeRingBufferSink` 在 `capacity` 为较大正整数时会立即预分配 `new Array(capacity)`；若误传极大值，可能出现瞬时内存放大或 `RangeError`。建议后续补充容量上限/文档约束（当前 PR 不阻断）。
- 结论：可合并（需按团队节奏处理机器人 review 触发时机）

## 机器人评论状态（PR #70）
- CodeRabbit（`coderabbitai`）：`Rate limit exceeded`，当前未产出新的逐行审查意见；需等待限流窗口后再触发 `@coderabbitai review`。
- GitHub Actions（`github-actions`）：`logix-perf` 汇总评论为 `status: ok`（`comparable=true`，`regressions=0`，`improvements=0`）。
- Vercel（`vercel`）：预览部署评论状态显示 `Building`。

## CI watcher 日志
- 已确认存在且可读：`.context/pr-ci-watch/pr-70-20260224-153142.log`
