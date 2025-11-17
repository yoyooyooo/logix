# Contract: Txn Zero-Alloc（hot path）

## Required

- `instrumentation=light` MUST 是 argument-based recording：调用点不得创建 patch 对象。
- 即使 `instrumentation=full`，调用点也不得 materialize patch/snapshot 对象；如需对象，仅允许在 txn 聚合器边界 materialize，且不得把对象税泄漏到 `instrumentation=light`。
- 禁止 rest 参数（避免隐式数组分配）；分支必须搬到 loop 外。
- 事务窗口内不得出现字符串解析往返（`split/join`）；若需要可读信息，仅在事务外 materialize（与 050 对齐）。
- txn 内 dirty roots/dirty-set 必须采用 **非字符串往返** 的表示（对齐 050）：优先使用 `FieldPath` segments 透传；string path 仅允许作为输入/显示，并且不得在事务窗口内 `join→split` 往返。
- 动态/异常路径必须显式降级（`dirtyAll=true + reason`），不得隐式退化为字符串解析或全量扫描。
- P1 Gate 覆盖场景触发 `dirtyAll=true` 降级视为 FAIL（必须先修复或扩大 registry 容量并证据化）。
