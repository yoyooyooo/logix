# Contract: Migration (O-026)

## Migration Steps

1. 三端 consumer 先支持 digest-first lookup。
2. runtime 输出双轨验证（短期）。
3. 切换为 digest-only。
4. 删除旧重载荷字段。

## Forward-only Rule

- 迁移完成后不保留长期兼容层。
