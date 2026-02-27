# Contract: Migration (O-022)

## Migration Direction

- 默认迁移到 `$.dispatchers.<K>(payload)`（一等公开高频入口）。
- 动态/桥接场景迁移到 `$.action(token)(payload)`。
- `$.dispatch(type,payload)` 保留为兼容/低阶入口，不作为新代码默认写法。

## Breaking Notes

- 若后续移除字符串入口，视为破坏性变更：
  - 无兼容层
  - 无弃用期
  - 仅提供明确迁移说明

## Scan & Migration Notes (2026-02-27)

- `examples/logix`：已完成字符串入口扫描，未发现 `$.dispatch('type', payload)` 高影响调用点。
- `packages/logix-react`：已将 `test/browser/perf-boundaries/workflow-075.test.tsx` 中 2 处 `$.dispatch('...')` 迁移为 `$.dispatchers.*()`。
