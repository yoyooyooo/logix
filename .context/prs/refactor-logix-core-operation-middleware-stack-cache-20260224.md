# Operation runtime services 缓存与 Flow linkId 一致性

## Branch
- refactor/logix-core-operation-middleware-stack-cache

## 核心改动
- 合并 middleware/runSession 解析；统一 opSeq 分配；修复空/非空 middleware 栈 linkId 语义一致性并补测

## 验证
- pnpm typecheck
- pnpm test:turbo

## 独立审查
- 结论：approve（建议后续补有限 opSeq 覆盖）

## 机器人评论
- PR 创建后拉取 gh pr view <pr-number> --repo yoyooyooo/logix --comments 并记录处理结论。
