# external-owned field-path key 稳定编码升级

## Branch
- refactor/logix-core-module-runtime-owned-path-key

## 核心改动
- field-path.toKey 改为长度前缀编码；ownership 集合切换 toKey；补特殊字符与唯一性测试并同步文档

## 验证
- pnpm typecheck
- pnpm test:turbo

## 独立审查
- 结论：approve（建议后续补带点号键名场景）

## 机器人评论
- PR 创建后拉取 gh pr view <pr-number> --repo yoyooyooo/logix --comments 并记录处理结论。
