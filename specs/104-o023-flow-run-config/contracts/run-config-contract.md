# Contract: run(config) Surface (O-023)

## Public Contract

- 默认入口：`run(config)`。
- config 字段约束：`effect` 必填；`mode` 可选（默认 `task`）；`options` 可选。
- mode 语义必须与历史 run* 等价。

## Deprecation Policy

- 旧 run* 不再推荐。
- 迁移完成后删除旧符号，不保留兼容层。
