# TickScheduler trace 聚合降分配

## Branch
- refactor/logix-core-tickscheduler-trace-allocation-cut

## 核心改动
- trace:tick 聚合改为单次遍历，减少中间数组与重复扫描

## 验证
- pnpm typecheck
- pnpm test:turbo

## 独立审查
- 结论：approve（建议后续补 TriggerKind 穷尽保护）

## 机器人评论
- PR 创建后拉取 gh pr view <pr-number> --repo yoyooyooo/logix --comments 并记录处理结论。
