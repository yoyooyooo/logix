# RuntimeStore listener snapshot 化

## Branch
- refactor/logix-core-runtime-store-listener-snapshot
- PR: #64 (https://github.com/yoyooyooo/logix/pull/64)

## 核心改动
- 只在订阅变更时重建 topic listener 快照；新增 listenerSnapshot 行为测试

## 验证
- pnpm typecheck
- pnpm test:turbo

## 独立审查
- 结论：approve（建议后续补 flushNow 集成样例）

## 机器人评论处理
- CodeRabbit: 当前仅出现 rate limit 提示，无具体代码建议；本轮无需改动。
- Vercel: 部署元数据通知，非代码质量问题；本轮无需改动。
