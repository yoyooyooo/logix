# RuntimeStore listener snapshot 化

## Branch
- refactor/logix-core-runtime-store-listener-snapshot

## 核心改动
- 只在订阅变更时重建 topic listener 快照；新增 listenerSnapshot 行为测试

## 验证
- pnpm typecheck
- pnpm test:turbo

## 独立审查
- 结论：approve（建议后续补 flushNow 集成样例）

## 机器人评论
- PR 创建后拉取 gh pr view <pr-number> --repo yoyooyooo/logix --comments 并记录处理结论。
