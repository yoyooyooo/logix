# 082 · Platform-Grade Rewriter Contracts

本目录固化 082 的 contracts（长期可存储、可 diff 的协议面），用于平台/CI/Devtools 统一消费：

- `PatchPlan@v1`：结构化写回计划（report/write 共用）
- `WriteBackResult@v1`：写回执行结果（modified/skipped/failed）

## Schemas

- `schemas/patch-plan.schema.json`
  - Title: `PatchPlan@v1`
  - Invariants:
    - 只写入缺失字段（最小 diff；不覆盖作者显式声明）
    - `mode=report|write` 双模式；拟修改摘要必须一致
    - `reasonCodes` 必须可解释（宁可失败不 silent corruption）
    - write-back 必须防竞态：write 模式必须携带并校验 `expectedFileDigest`（文件变化则 fail）

- `schemas/writeback-result.schema.json`
  - Title: `WriteBackResult@v1`
  - Invariants:
    - `mode=report|write` 与 PatchPlan 对齐
    - 幂等：重复运行应收敛为 no-op（由上游/集成测试验证）
