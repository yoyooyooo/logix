# Contract: FieldPath（源头零拷贝 + 事务内禁往返）

## Required

- FieldPath MUST 支持 segments 形式透传（源头零拷贝）。
- string 形式仅作为输入/显示；事务窗口内不得反复 join→split。
- 若需要 canonical string，用于序列化/诊断边界一次性 materialize。

