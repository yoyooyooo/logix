# Contracts: 037 限定 scope 的全局（路由 Host(imports) + ModuleScope）

本目录固化 037 的对外行为契约，作为实现与测试的单一事实源。

- `contracts/react-module-scope.md`：Scope 工具（Provider + hook）与可选 Bridge 的行为语义、错误口径与测试矩阵
- `contracts/react-modulecache-eviction.md`：**[DEFERRED]** 显式回收 API（eviction/clear）的契约草案（若后续仍需要，另起 spec 或作为后续 phase 再评估）
