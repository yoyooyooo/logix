# 084 Contracts: Loader Spy（证据 ≠ 权威）

本目录固化 084 的对外契约（JSON Schema），用于：

- 平台/CLI/CI 的输入输出校验；
- 防止字段漂移与“并行真相源”；
- 明确 **Coverage Marker**（覆盖局限）语义，避免证据被误用为权威。

## Schemas

- `schemas/spy-evidence-report.schema.json`：`SpyEvidenceReport@v1`

## Coverage Marker（必须展示）

`SpyEvidenceReport.coverage` 的定位是 **证据的适用边界声明**，不是覆盖率统计：

- `stage="loader"`：表示“加载态/构造态 best-effort 采集窗口”；
- `completeness="best-effort"`：明确不承诺穷尽分支；
- `limitations[]`：必须显式列出限制（例如“仅代表当前执行路径”“缺失服务会提前终止采集窗口”“不保证捕获绕过 Tag 的依赖访问”等）。

## Notes

- 本报告默认 report-only，不允许直接写回源码；写回必须走 `079/082` 的保守闭环。

