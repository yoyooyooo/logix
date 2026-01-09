# Research: 082 Platform-Grade Rewriter MVP（PatchPlan@v1）

## Decision 1：回写能力必须 Node-only，并与 runtime 隔离

**Rationale**：

- 回写需要 AST 编辑能力与文件系统写入，天然属于 Node-only。
- `@logixjs/core` 必须保持 runtime 纯净（不引入 `ts-morph/swc` 等重依赖）。

## Decision 2：回写的首要目标是“安全与最小 diff”

**Rationale**：

- 错误回写会污染源码真相源，比“没补上”更危险。
- 全双工前置阶段不追求覆盖率，追求可信度：宁可失败不 silent corruption。

**Rules**：

- 只新增缺失字段，不重排现有字段；
- `services: {}` 视为作者显式声明，不覆盖；
- 子集外形态一律 report-only/失败。

## Decision 3：以 `PatchPlan@v1` + `WriteBackResult@v1` 形成“可审阅/可门禁”的协议闭环

**Rationale**：

- report-only 与 write-back 共享同一套结构化计划与 reason codes，保证“先审阅再写回”可控推进；
- CI/Devtools 能用 JSON 工件统一消费结果（而不是解析日志）。

## Decision 4：TS AST 编辑使用 `ts-morph`，必要时 `swc` 辅助

**Rationale**：

- `ts-morph` 适合在 TypeScript Program 上做定位与写回；
- `swc` 仅作为辅助（例如某些 print/format 或降级判定），避免形成双真相源。

## Decision 5：实现形态尽可能用 `effect`（同构）

**Rationale**：

- write-back 流程天然需要“可注入/可组合/可测试”：FS、Reporter、Budget、SafetyPolicy；
- 用 Tag+Layer 组织能与 CLI/平台消费者保持同构心智。
