# 079 · Platform Anchor Autofill Contracts

本目录固化 079 的 contracts（长期可存储、可 diff 的协议面），用于平台/CI/Devtools 统一消费：

- `AutofillReport@v1`：保守补全的结构化报告（report-only / write-back 共用的解释输出）
- `AutofillReasonCode@v1`：跳过/降级原因枚举（forward-only）

## Schemas

- `schemas/autofill-report.schema.json`
  - Title: `AutofillReport@v1`
  - Kind: `AutofillReport`
  - Invariants:
    - JSON-safe、确定性、稳定排序
    - 只补未声明字段；不确定必跳过（宁可漏不乱补）

- `schemas/autofill-reason-codes.schema.json`
  - Title: `AutofillReasonCode@v1`
  - Invariants:
    - 枚举受控；新增/改名属于 breaking（需迁移说明，forward-only）

