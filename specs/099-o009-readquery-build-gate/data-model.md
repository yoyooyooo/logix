# Data Model: O-009 ReadQuery Build Gate

## 1) SelectorQualityReport（模块级）

- **Purpose**: 构建期输出 selector 质量报告，作为 strict gate 主裁决事实源。
- **Fields**:
  - `reportId: string`（稳定摘要）
  - `moduleId: string`
  - `generatedAt: string`（ISO 时间，仅元信息）
  - `entries: SelectorQualityEntry[]`
  - `summary: SelectorQualitySummary`
- **Invariants**:
  - `entries.selectorId` 在同一 `moduleId` 内唯一。
  - `summary.total === entries.length`。

## 2) SelectorQualityEntry（selector 级）

- **Purpose**: 单个 selector 的定级与门禁结果。
- **Fields**:
  - `selectorId: string`
  - `debugKey?: string`
  - `lane: 'static' | 'dynamic'`
  - `producer: 'aot' | 'jit' | 'manual' | 'dynamic'`
  - `readsDigest?: { count: number; hash: number }`
  - `fallbackReason?: 'missingDeps' | 'unsupportedSyntax' | 'unstableSelectorId' | 'missingBuildGrade'`
  - `strictGateVerdict: 'PASS' | 'WARN' | 'FAIL'`
  - `strictGateRule?: 'denyFallbackReason' | 'requireStatic:global' | 'requireStatic:selectorId' | 'requireStatic:module'`
- **Invariants**:
  - `lane='static'` 时 `fallbackReason` 必须为空。
  - `lane='dynamic'` 时 `fallbackReason` 必须存在。
  - `strictGateVerdict='FAIL'` 时必须存在可序列化 `strictGateRule`。

## 3) SelectorQualitySummary

- **Purpose**: 构建期快速统计，供 CI/PR 展示。
- **Fields**:
  - `total: number`
  - `staticCount: number`
  - `dynamicCount: number`
  - `warnCount: number`
  - `failCount: number`
  - `fallbackBreakdown: Record<string, number>`
- **Invariants**:
  - `staticCount + dynamicCount === total`
  - `warnCount + failCount <= dynamicCount`

## 4) ReadQueryRuntimeConsumptionRecord

- **Purpose**: 运行时记录“本次 selector 消费来自 build/jit/dynamic 哪条路径”。
- **Fields**:
  - `moduleId: string`
  - `instanceId: string`
  - `txnSeq: number`
  - `selectorId: string`
  - `source: 'build' | 'runtime_jit' | 'runtime_dynamic_fallback'`
  - `fallbackReason?: string`
- **Invariants**:
  - `source='build'` 时 `fallbackReason` 为空。
  - `source='runtime_dynamic_fallback'` 时 `fallbackReason` 非空。

## 5) MigrationImpact

- **Purpose**: 描述迁移影响范围与操作步骤。
- **Fields**:
  - `legacyRuntimeGateEnabled: boolean`
  - `buildGateEnabled: boolean`
  - `breakingChanges: string[]`
  - `requiredActions: string[]`
- **Invariants**:
  - 若 `buildGateEnabled=true` 且 `legacyRuntimeGateEnabled=false`，必须提供 `requiredActions`。
