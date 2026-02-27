# Quickstart: O-023 Flow run(config)

## 1. 阅读规格

1. 确认 `spec.md` 中 `run(config)` 为唯一推荐入口。
2. 确认 `contracts/migration.md` 中旧 run* 迁移路径。

## 2. 建议实施顺序

1. 在 `FlowRuntime` 引入统一策略执行入口。
2. 将旧 run* 入口改为过渡别名并回收内部实现。
3. 迁移文档、示例与测试。

## 3. 验证命令

```bash
pnpm typecheck
pnpm lint
pnpm test:turbo
```

## 4. 性能证据

- 按 `plan.md` 采集 before/after/diff。
