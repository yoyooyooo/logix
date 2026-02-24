# EffectOp middleware 组合缓存

## Branch
- refactor/logix-core-effectop-compose-cache

## 核心改动
- 按 MiddlewareStack 引用做 WeakMap 组合函数缓存，减少重复 compose 开销

## 验证
- pnpm typecheck
- pnpm test:turbo

## 独立审查
- 结论：approve（建议后续补内存回归基线）

## 机器人评论
- PR 创建后拉取 gh pr view <pr-number> --repo yoyooyooo/logix --comments 并记录处理结论。
