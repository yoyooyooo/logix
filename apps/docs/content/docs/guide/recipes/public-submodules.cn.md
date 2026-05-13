---
title: Public submodules
description: 只从稳定包根和明确支持的公开子路径导入。
---

只从包根和明确支持的公开子路径导入。

## 规则

1. 从 `@logixjs/<pkg>` 或明确支持的公开子路径导入。
2. 不导入 `internal/*`、`src/*`、`dist/*` 路径。
3. 迁移后用仓库校验命令验证公开导入面。

## 常见替换

- `@logixjs/domain/crud` → `@logixjs/domain/Crud`

## 验证

运行：

```bash
pnpm verify:public-submodules
pnpm typecheck
pnpm lint
pnpm test
```
