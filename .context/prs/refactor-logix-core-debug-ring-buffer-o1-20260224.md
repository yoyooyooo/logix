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
