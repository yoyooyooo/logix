# Package Entry Ledger

| Entry | Role | Notes |
| --- | --- | --- |
| `Form.ts` | package-level 主入口 | 对外主叙事固定为 `make / from` |
| `FormView.ts` | 辅入口 | 只承接视图投影 |
| `Field.ts` | direct API / expert helper | 保留 `computed / link / source`；root barrel 不再镜像短名 |
| `react/**` | 辅入口 | hooks 与 React 宿主投影 |
| `index.ts` | root barrel | 不再导出 `derived` 或 `formDomainSurface` |
