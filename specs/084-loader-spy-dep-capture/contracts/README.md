# 084 · Loader Spy Evidence Contracts

本目录固化 084 的 contracts（长期可存储、可 diff 的协议面），用于平台/CI/Devtools 统一消费：

- `SpyEvidenceReport@v1`：加载态/构造态 best-effort 的依赖使用证据（report-only）

> 重要：该报告是 evidence（证据），不是权威事实源；不得作为写回依据。

## Schemas

- `schemas/spy-evidence-report.schema.json`
  - Title: `SpyEvidenceReport@v1`
  - Kind: `SpyEvidenceReport`
  - Invariants:
    - JSON-safe、确定性、稳定排序
    - 必含 `coverage`（best-effort 覆盖标记与局限说明；不提供行级覆盖率/真实覆盖统计）
    - 可选 `diff`：用于“声明 vs 实际”偏离对照（仅建议）
