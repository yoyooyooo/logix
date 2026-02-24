# TickScheduler listener flush 扁平管线

## Branch
- refactor/logix-core-tickscheduler-listener-flush-pipeline
- PR: #66 (https://github.com/yoyooyooo/logix/pull/66)

## 核心改动
- 提交后 listener 收集改为扁平列表；flush 阶段直接顺序分发，减少层级拆装

## 验证
- pnpm typecheck
- pnpm test:turbo

## 独立审查
- 结论：approve（建议后续补多 topic 同 listener 回归）

## 机器人评论处理
- CodeRabbit: 当前仅出现 rate limit 提示，无具体代码建议；本轮无需改动。
- Vercel: 部署元数据通知，非代码质量问题；本轮无需改动。
