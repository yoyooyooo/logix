# Flow opSeq 上下文快路径

## Branch
- refactor/logix-core-flow-runtime-opseq-fastpath
- PR: #68 (https://github.com/yoyooyooo/logix/pull/68)

## 核心改动
- 引入 FlowOpRunContext 复用 per-stream 元信息；RunSession 下按 payload 分配 opSeq；补 run/runParallel/runLatest/runExhaust 元信息锚点测试

## 验证
- pnpm typecheck
- pnpm test:turbo

## 独立审查
- 结论：approve（建议后续补无 RunSession 别名化边界）

## 机器人评论处理
- CodeRabbit: 当前仅出现 rate limit 提示，无具体代码建议；本轮无需改动。
- Vercel: 部署元数据通知，非代码质量问题；本轮无需改动。
