# Decisions（跨 spec 的硬约束与口径）

- 单一真相源：权威永远是源码显式锚点字段；TrialRun/Spy 只能 evidence，不得成为 sidecar SSoT。
- 宁可漏不乱补：Autofill 只补“未声明且高置信度可确定”的字段；遇到歧义/动态/子集外形态一律跳过并输出 reason codes。
- `ServiceId` 稳定化：仅允许 `tag.key/id/_id`；`tag.toString()` 仅用于 dev 展示，禁止进入 IR。
- 端口命名：默认 `port = serviceId`（除非强解释需求再显式命名）。
- M2 → M3 门槛：回写闭环（081/082/079/085）未达标前，禁止推进需要“大规模自动回写/迁移”的语义特性（Slots/Spy 仅允许 report/手写探索）。
- Node-only 隔离：`packages/logix-core` 禁止依赖 `typescript/ts-morph/swc`；Parser/Rewriter/Autofill/CLI 全部落在 Node-only 包。
- Rewriter 基线：最小文本插入 + byte-level 幂等；Plan→Write 需校验文件 digest（竞态防线）。
- CLI 输出：stdout 统一 `CommandResult@v1`（不输出时间戳/随机）；Exit Code：`0=PASS`、`2=VIOLATION`、`1=ERROR`；解析类命令 lazy-load `ts-morph`，`--help` 冷启动预算 `< 500ms`。
- Slots（083）：唯一权威为 `LogicUnitOptions.slotName?: string`；`slotName` regex `/^[A-Za-z][A-Za-z0-9_]*$/`；未赋槽逻辑不进入 default slot。
- Spy（084）：Node-only Harness；“禁 IO”为契约要求但无法硬性证明；必须输出 `coverage.limitations` 与 violations；`usedServices[]` 去重且聚合 `occurrences`。

