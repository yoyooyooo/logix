# AppRuntime 与模块装配（impl）（LLM 薄入口）

本文件只保留导航；正文拆分到同目录分节文档中，按需加载。

## 边界与外链（避免重复叙述）

- AppRuntime/Runtime.make 的装配语义口径（SSoT）：`../runtime/05-runtime-implementation.00-architecture.md`、`../runtime/05-runtime-implementation.02-app-runtime-makeapp.md`
- 本目录仅补充 flatten 算法、导出边界与实现取舍；若装配语义发生变化，先回写 runtime SSoT

## 最短链路

- 我在找“flatten：ModuleDef → { layer, processes }”的算法：读 `01-app-runtime-and-modules.03-flatten-algorithm.md`
- 我在看 exports 封装边界：读 `01-app-runtime-and-modules.04-exports-boundary.md`

## 分节索引

- `01-app-runtime-and-modules.01-core-types.md`
- `01-app-runtime-and-modules.02-flatten-goal.md`
- `01-app-runtime-and-modules.03-flatten-algorithm.md`
- `01-app-runtime-and-modules.04-exports-boundary.md`
- `01-app-runtime-and-modules.05-tradeoffs.md`
