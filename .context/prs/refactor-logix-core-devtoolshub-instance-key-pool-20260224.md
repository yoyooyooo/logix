# DevtoolsHub diagnostics off 快路径与 instance key 池化

## Branch
- refactor/logix-core-devtoolshub-instance-key-pool

## 核心改动
- 新增 diagnostics=off 热路径短路；用 instance key 池化替代重复字符串拼接分配

## 验证
- pnpm typecheck
- pnpm test:turbo

## 独立审查
- 结论：approve（建议补 destroy 缺 instanceId 边界）

## 机器人评论
- PR 创建后拉取 gh pr view <pr-number> --repo yoyooyooo/logix --comments 并记录处理结论。
