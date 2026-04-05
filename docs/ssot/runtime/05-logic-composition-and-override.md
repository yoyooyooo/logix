---
title: Logic Composition And Override
status: living
version: 1
---

# Logic Composition And Override

## 当前规则

- `logic` 保留为一等复用单元
- `Program` 负责装配 `initial / capabilities / logics`
- `logic` 负责承载 `rules / lifecycle / tasks`
- `logics: []` 是 canonical 主写法

## 冲突规则

- 匿名 logic 只允许追加
- 命名 logic 默认冲突即 fail-fast
- 覆盖与禁用固定停留在 expert 层

## 当前一句话结论

共享 `Module`，按 `Program` 分区组合 `logics`，冲突默认 fail-fast，覆盖与禁用不进入 canonical surface。
