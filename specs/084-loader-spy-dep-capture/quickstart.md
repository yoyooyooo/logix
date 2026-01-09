# Quickstart: 084 Loader Spy 依赖采集（证据，不作权威）

> 目标：在不跑完整业务交互的前提下，采集 “`$.use(Tag)` 实际被调用过” 的 best-effort 证据，用于建议与解释（不写回源码）。

## 1) 产物是什么

- `SpyEvidenceReport@v1`：加载态服务使用证据报告（Slim/JSON/diffable）。
- 权威 schema：`specs/084-loader-spy-dep-capture/contracts/schemas/spy-evidence-report.schema.json`

## 2) 怎么运行（预期入口）

本能力通常由 `085` CLI 或平台侧 Node 工具链暴露（报表默认 report-only）：

- 预期命令形态：`logix ... spy ...`（名称可在实现阶段微调，但输出工件必须保持 `SpyEvidenceReport@v1`）

## 3) 如何解读结果

- `usedServices[]`：当前采集窗口内实际触达的服务清单（不代表全分支覆盖）。
- `rawMode[]`：无法解析/歧义/子集外形态的显式降级（reason codes）。
- `diff`（若提供）：用于提示“可能缺失 services 声明 / 声明冗余”（仅建议，不自动写回）。
- `coverage`：覆盖局限标记；必须在 UI/CI 中一并展示，避免被误解为权威。

