# Quickstart: O-025 DevtoolsHub 投影分层

## 1. 先确认合同

1. 阅读 `contracts/projection-tier-contract.md`。
2. 阅读 `contracts/consumer-degraded-contract.md`。

## 2. 实施顺序

1. 在 DevtoolsHub 增加 light/full 分层。
2. 更新 consumer 处理 degraded 语义。
3. 验证后再切默认策略到 light。

## 3. 验证命令

```bash
pnpm typecheck
pnpm lint
pnpm test:turbo
```
