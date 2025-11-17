# Data Model: 047 core-ng 全套切换达标门槛（无 fallback）

> 本文件定义 047 涉及的关键实体与关系，用于生成 tasks 与后续实现落点对齐。

## Entities

### CutoverCoverageMatrix

- `serviceIds`: `ReadonlyArray<string>`（Kernel Contract 覆盖范围内的必选 serviceId 列表；SSoT=代码：由 `@logix/core` 导出读取入口提供）
- `version`: `string`（矩阵版本；用于审计）
- `source`: `string`（单一事实源位置，必须可被测试读取）

### CutoverGateConfig

- `mode`: `"trial"` | `"fullCutover"`（fullCutover 禁止 fallback）
- `requestedKernelId`: `"core"` | `"core-ng"`
- `diagnostics`: `"off"` | `"light"` | `"full"`（必须支持 `off` 下输出最小结果）
- `allowContractDiffAllowlist`: `boolean`（是否启用“允许差异 allowlist”；默认 false/禁用；allowlist SSoT=代码 且默认空）

### ContractDiffAllowlist

- `entries`: `ReadonlyArray<{ metaKey: string; reason?: string }>`（允许差异条目；仅允许 op meta 的部分 key 差异；以 `metaKey` 为主键便于审计）
- `source`: `string`（单一事实源位置；SSoT=代码：由 `@logix/core` 导出读取入口提供）

### CutoverGateResult

- `status`: `"pass"` | `"fail"`
- `kernelId`: `"core"` | `"core-ng"`
- `missingServiceIds`: `ReadonlyArray<string>`
- `fallbacks`: `ReadonlyArray<{ serviceId: string; fromImplId: string; toImplId: string }>`
- `allowedDiffs`: `ReadonlyArray<{ metaKey: string; count: number }>`（命中 allowlist 时仍可 PASS，但必须输出最小摘要）
- `evidenceAnchor`: { moduleId: string; instanceId: string; txnSeq: number; opSeq?: number }（最小锚点；装配期失败用 `txnSeq=0` 代表 assembly）

### ContractDiffReport

- `status`: `"pass"` | `"fail"`
- `diff`: unknown（机器可读 diff；必须可序列化）
- `anchors`: `ReadonlyArray<{ instanceId: string; txnSeq: number; opSeq: number }>`

### PerfEvidenceSet

- `matrixId`: `string`（suites/budgets 的 SSoT；before/after 必须一致）
- `matrixHash`: `string`（矩阵哈希；before/after 必须一致，保证可比性）
- `profile`: `string`（硬结论至少 `default`；`quick` 仅线索）
- `node.before`: path
- `node.after`: path
- `node.diff`: path
- `browser.before`: path
- `browser.after`: path
- `browser.diff`: path

## Relationships

- CutoverGateResult 依赖 CutoverCoverageMatrix（确定 coverage）。
- ContractDiffReport 是 CutoverGateResult 的必要组成（契约一致性证明）。
- ContractDiffAllowlist（可选）影响 ContractDiffReport 的裁决与 CutoverGateResult 的 `allowedDiffs` 摘要输出。
- PerfEvidenceSet 是 CutoverGateResult 的必要组成（预算门槛证明）。
