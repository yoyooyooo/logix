# DevtoolsHub diagnostics off 快路径与 instance key 池化

## Branch
- refactor/logix-core-devtoolshub-instance-key-pool
- PR: #60 (https://github.com/yoyooyooo/logix/pull/60)

## 核心改动
- 新增 diagnostics=off 热路径短路；用 instance key 池化替代重复字符串拼接分配

## 验证
- pnpm typecheck
- pnpm test:turbo

## 独立审查
- 结论：approve（建议补 destroy 缺 instanceId 边界）

## 机器人评论处理
- CodeRabbit: 当前仅出现 rate limit 提示，无具体代码建议；本轮无需改动。
- Vercel: 部署元数据通知，非代码质量问题；本轮无需改动。
