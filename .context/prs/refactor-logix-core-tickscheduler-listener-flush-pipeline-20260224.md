# TickScheduler listener flush 扁平管线

## Branch
- refactor/logix-core-tickscheduler-listener-flush-pipeline

## 核心改动
- 提交后 listener 收集改为扁平列表；flush 阶段直接顺序分发，减少层级拆装

## 验证
- pnpm typecheck
- pnpm test:turbo

## 独立审查
- 结论：approve（建议后续补多 topic 同 listener 回归）

## 机器人评论
- PR 创建后拉取 gh pr view <pr-number> --repo yoyooyooo/logix --comments 并记录处理结论。
