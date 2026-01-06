# Examples（文档演练）

本目录用于记录“从 Intent 到实现”的演练型文档，用来验证写法、对齐术语与抽取可复用模式。

- 文档应尽量指向真实代码落点（通常在 `examples/logix/*`），避免出现仅文档内存在的写法；
- 若与 SSoT 冲突，以 `docs/specs/sdd-platform/ssot/*` 与 runtime SSoT 为准，并回写修正本目录。
- 写法与目录结构约定：优先对齐 `../logix-best-practices/README.md`（面向 examples dogfooding）。

## 索引

- `01-smart-search-poc.md`：Smart Search 场景的示例演练（历史文件名保留）。
- `02-logix-galaxy-api-postgres.md`：Galaxy 后端示例的 PostgreSQL 开发环境表结构与接口契约（SSoT）。
- `03-effect-httpapi-postgres-crud-template.md`：Effect HttpApi + PostgreSQL 的 CRUD 写法模板（目录结构、测试用例、表设计、契约工件）。
- 真实代码：`examples/logix/src/scenarios/*`、`examples/logix/src/patterns/*`。

## 何时阅读

- 需要找一个“可跑通的端到端例子”作为对照时；
- 需要把某个模式从示例中提炼为 Pattern/Intent 资产时。
