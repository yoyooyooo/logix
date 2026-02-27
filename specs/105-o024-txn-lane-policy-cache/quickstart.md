# Quickstart: O-024 Txn Lane 策略前移缓存

## 1. 先看语义变化

1. 阅读 `spec.md` 中 override 时序说明。
2. 阅读 `contracts/migration.md` 的 re-capture 操作步骤。

## 2. 建议实施顺序

1. 在 capture 阶段引入策略缓存。
2. 调整热路径读取缓存并去除重复 merge。
3. 对齐 `txn_lane_policy::resolved` 事件与文档。

## 3. 验证命令

```bash
pnpm typecheck
pnpm lint
pnpm test:turbo
```

## 4. 性能证据

- 按 `plan.md` 采集 merge 指标与调度性能证据。
