# Contract: Argument-based Patch Recording（light 零分配）

> 说明：本契约的“权威落点”已迁移到 `specs/051-core-ng-txn-zero-alloc/`（051 负责 txn/patch/dirtyset 的零分配收口）。本文件保留为 050 的历史引用与上下文补充。

## Required

- light 档位 MUST 支持 argument-based recording：调用点不得创建 patch 对象。
- 禁止使用 rest 参数（避免隐式数组分配）。
- 分支必须搬到 loop 外（避免 per-step 分支预测成本）。
- full 档位可以在事务内部 materialize patch 对象并保留历史，但不得要求调用点先分配。
