# Contract: API Surface (O-022)

## Frozen Hierarchy

1. `$.dispatchers`：一等公开高频类型安全入口（默认推荐）。
2. `$.action(token)`：动态/桥接入口（委托 ActionIntent）。
3. `$.dispatch(type,payload)`：兼容/低阶入口（非推荐）。

## Policy

- 文档与示例默认只能推荐第 1 层。
- 第 3 层只允许在迁移/兼容章节出现。
