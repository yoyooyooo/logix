# EffectOp middleware 组合缓存

## Branch
- refactor/logix-core-effectop-compose-cache
- PR: #62 (https://github.com/yoyooyooo/logix/pull/62)

## 核心改动
- 按 MiddlewareStack 引用做 WeakMap 组合函数缓存，减少重复 compose 开销

## 验证
- pnpm typecheck
- pnpm test:turbo

## 独立审查
- 结论：approve（建议后续补内存回归基线）

## 机器人评论处理
- CodeRabbit: 当前仅出现 rate limit 提示，无具体代码建议；本轮无需改动。
- Vercel: 部署元数据通知，非代码质量问题；本轮无需改动。
