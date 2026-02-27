# Quickstart: O-022 Action API 收敛

## 1. 先确认裁决

1. 打开 `spec.md` 的 “API Hierarchy Decision” 段。
2. 确保实现与文档都遵守三层分级。

## 2. 实施顺序

1. 先在 ActionIntent 内核统一 token/type/payload 归一。
2. 让 `$.dispatchers` 与 `$.action(token)` 统一委托到内核。
3. 保留 `$.dispatch(type,payload)` 为兼容低阶入口并补迁移说明。

## 3. 验证命令

```bash
pnpm typecheck
pnpm lint
pnpm test:turbo
```

## 4. 性能验证

- 按 `plan.md` 采集 dispatch 热路径 perf evidence。
