# external-owned field-path key 稳定编码升级

## Branch
- refactor/logix-core-module-runtime-owned-path-key
- PR: #67 (https://github.com/yoyooyooo/logix/pull/67)

## 核心改动
- field-path.toKey 改为长度前缀编码；ownership 集合切换 toKey；补特殊字符与唯一性测试并同步文档

## 验证
- pnpm typecheck
- pnpm test:turbo

## 独立审查
- 结论：approve（建议后续补带点号键名场景）

## 机器人评论处理
- CodeRabbit: 当前仅出现 rate limit 提示，无具体代码建议；本轮无需改动。
- Vercel: 部署元数据通知，非代码质量问题；本轮无需改动。
