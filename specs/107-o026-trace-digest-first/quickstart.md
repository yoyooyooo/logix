# Quickstart: O-026 Trace digest-first

## 1. 先看合同

1. 阅读 `contracts/digest-payload-contract.md`。
2. 阅读 `contracts/replay-lookup-contract.md`。

## 2. 实施顺序

1. 增加 digest-first 事件合同。
2. 更新 Devtools/Replay/Platform lookup 逻辑。
3. 切 runtime 默认并删除旧重载荷字段。

## 3. 验证命令

```bash
pnpm typecheck
pnpm lint
pnpm test:turbo
```
