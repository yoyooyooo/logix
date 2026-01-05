# Migration

本特性为新增 API（无 breaking）。

## 建议迁移（可选）

当你发现 selector 退化 dynamic（`reads=[]` / `fallbackReason=unsupportedSyntax|missingDeps|unstableSelectorId`）并导致性能问题时：

- 把“闭包组合器”改写为 `ReadQuery.createSelector({ inputs, result })`；
- 保证 inputs 可静态编译（或改为显式 `ReadQuery.make`）；
- 若存在闭包参数，使用 `params` 显式把参数纳入 selectorId。

