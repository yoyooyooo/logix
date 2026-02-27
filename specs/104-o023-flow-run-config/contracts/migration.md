# Contract: Migration (O-023)

## Migration Steps

1. 用 `run(config)` 覆盖旧 run* 语义。
2. 不保留 alias 迁移窗口，旧 run* 通过 codemod/lint 一次性替换。
3. 通过 codemod/lint 完成全仓替换。
4. 删除旧 run* 符号。

## Forward-only Rule

- 不提供兼容层。
- 不提供弃用期（与上文一次性替换保持一致）。
