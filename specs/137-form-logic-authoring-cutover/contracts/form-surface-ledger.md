# Form Surface Ledger: Form Logic Authoring Cutover

## Canonical Default Path

- `Form.make(...)`
- `Form.from(schema).logic(...)`

## Helper Route

- `$.rules(...)`
- `$.derived(...)`

## Expert Route

- `$.fields(...)`
- `Form.Field.*`
- top-level `Form.make({ fields })`

## Legacy Top-Level Route

- `Form.make({ rules })`
- `Form.make({ derived })`

## Freeze Decision

| Surface | Decision | Tier | Notes |
| --- | --- | --- | --- |
| `Form.make` | keep | default | 唯一顶层创建入口 |
| `Form.from(schema).logic` | keep | default | 唯一 schema-scoped canonical authoring path |
| `$.rules` | keep | helper | 服务 `$.logic({ rules })` |
| `$.derived` | keep | helper | 服务 `$.logic({ derived })` |
| `$.fields` | keep | expert | 原始 field fragments 只停在专家路径 |
| top-level `Form.make({ rules })` | demote | legacy | 允许过渡，触发 warning |
| top-level `Form.make({ derived })` | demote | legacy | 允许过渡，触发 warning |
| top-level `Form.make({ fields })` | keep | expert | 仅保留 field-kernel 级显式场景 |
