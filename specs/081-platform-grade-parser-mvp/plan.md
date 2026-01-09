# Implementation Plan: Platform-Grade Parser MVP（081）

**Branch**: `081-platform-grade-parser-mvp` | **Date**: 2026-01-09 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `specs/081-platform-grade-parser-mvp/spec.md`

## Summary

交付一个 Node-only 的 Platform-Grade Parser MVP：对受限子集进行解析，产出 `AnchorIndex@v1`（定义点/使用点/缺口点/降级原因），作为：

- 平台侧“结构可见 + 可解释降级”的索引事实源；
- `082` 的安全回写前置（提供精确插入点/缺口点）；
- `079` 的保守补全前置（只在可确定处生成候选）。

关键裁决：TS 解析用 `ts-morph`；如需 AST 辅助用 `swc`；Node-only 引擎尽可能用 `effect` 组织；解析期不执行用户代码。

## Questions Digest（外部问题清单回灌）

来源：外部问题清单通过 `$speckit plan-from-questions` 贴入（本段只记录裁决，不记录全文）。

- Q014：Platform-Grade 子集必须显式枚举支持的语法形态（模块定义/导出/对象字面量约束），子集外统一 Raw Mode。
- Q015：Parser 不追踪 re-export/barrel 的“导出链语义”，只扫描定义点；入口选择由 CLI/平台负责。
- Q016：Service Use 仅识别 `$.use(Tag)`（不解析 `yield* Tag` 这种 Effect Env 读取形态）。
- Q017：AnchorIndex@v1 不包含文件 hash/版本指纹（增量构建留给后续版本；当前以 include/exclude + budgets 控制规模）。

## Deepening Notes（关键裁决）

- Decision: Platform-Grade 子集边界显式枚举；子集外统一 Raw Mode + reason codes（宁可漏不乱补；source: spec Clarifications AUTO + Q014）。
- Decision: 解析期不执行用户代码；所有输入只来自源码文本与 tsconfig（source: spec Clarifications AUTO）。
- Decision: `$.use(Tag)` 是唯一可识别的服务依赖使用点；`yield* Tag`（Effect Env 读取）不纳入（source: spec Clarifications AUTO + Q016）。
- Decision: 确定性优先：AnchorIndex 默认不输出耗时字段；如需性能摘要，必须可配置关闭且不影响字节级确定性（source: spec Clarifications AUTO）。

## Technical Context

**Language/Version**: TypeScript（workspace：5.8.2；以 `package.json` 为准）  
**Primary Dependencies**: `effect` v3、Node-only：`ts-morph`（TypeScript Program + AST）、（可选）`swc`（辅助 parse/print/降级分析）  
**Storage**: N/A（输出为 JSON 工件；可选落盘）  
**Testing**: Vitest（建议为 AnchorIndex 的确定性/降级 reason codes 增加单元测试；集成测试由 085 CLI 承担）  
**Target Platform**: Node.js 20+  
**Project Type**: pnpm workspace（packages）  
**Performance Goals**: N/A（解析器不在 runtime 热路径；但必须提供可解释的输入规模/耗时摘要的生成方式，且默认不影响确定性）  
**Constraints**: 单一真相源、宁可错过不可乱补、输出确定性/可序列化/可 diff、子集外必须显式 Raw Mode

## Constitution Check

- **Intent → Flow/Logix → Code → Runtime**：本特性处在 Code→IR 的“平台反射侧”；产物用于平台/CI/Devtools，不改变运行时语义。
- **Docs-first & SSoT**：Platform-Grade 子集的边界裁决以 `docs/ssot/platform/ir/00-codegen-and-parser.md` 为基线；本特性固化为可运行的 AnchorIndex 契约（`contracts/schemas/*`）。
- **IR & anchors**：AnchorIndex 属于“平台索引工件”，不能与 Manifest/TrialRunReport 形成并行权威；它只提供定位/降级原因与可回写缺口点。
- **Deterministic identity**：AnchorIndex 不包含时间戳/随机；内部 nodeKey/entryKey 必须可复现（基于 file+span+kind 等确定性字段）。
- **Transaction boundary**：本特性不触及事务窗口；解析期禁止执行用户代码。
- **Breaking changes**：AnchorIndex 契约以 schema version 化演进；破坏式变更通过 `@vN` 或 schemaVersion 升级表达（forward-only）。

## Design

### 1) AnchorIndex@v1（契约与稳定性）

- 契约落点：`specs/081-platform-grade-parser-mvp/contracts/schemas/anchor-index.schema.json`
- 输出必须包含：
  - `entries[]`：至少覆盖 ModuleDef/LogicDef/ServiceUse/AutofillTarget；
  - `rawMode[]`：对子集外/不确定项的显式降级记录；
  - `reasonCodes[]`：每个 skipped/降级项必须带可枚举原因；
  - `summary`：输入规模与计数摘要（不含时间戳；允许包含耗时 ms 但必须可配置关闭，默认不输出以保持字节级确定性）。

### 2) ServiceId/ModuleId 的“静态可确定”解析策略

目标：支撑 `079` 的 `port=serviceId` 默认补全，但坚持“宁可漏不乱补”。

- ServiceId 的权威定义与运行时规范化算法见 `specs/078-module-service-manifest/contracts/service-id.md`；本 spec 仅在能静态还原 `tag.key` 的字面量子集时输出 `serviceIdLiteral`。
- ModuleId：
  - 仅当 `Module.make(<string literal>, <object literal>)` 可识别时，输出 `moduleIdLiteral`；
  - 否则进入 Raw Mode（reason：non_literal_module_id / non_platform_grade_module_make）。
- ServiceId（Tag）：
  - 仅当 `$.use(<TagSymbol>)` 且 TagSymbol 可追溯到 `Context.Tag("<string literal>")` 时，输出 `serviceIdLiteral`；
  - 其它情况一律不输出 serviceId，并在 entry 上标注 reason（unresolved_tag_symbol / non_literal_tag_key / dynamic_tag_expr）。

### 3) 缺口点（AutofillTarget）定位策略

- 仅对可识别的 `Module.make(..., <object literal>)` 输出缺口点：
  - `missing.services`：当 object literal 不含 `services` 字段时提供插入点；
  - `missing.devSource`：当缺少 `dev.source` 且可安全插入时提供插入点；
  - 已存在 `services: {}` 视为“已声明”，禁止输出缺口（避免覆盖作者意图）。
- 插入点必须可复现：基于 object literal 的稳定 span + 规则化插入策略（例如按字典序或固定锚点字段后插入）。

## Perf Evidence Plan

N/A（Node-only 工具链；不触及 runtime 热路径）。

## Project Structure

### Documentation (this feature)

```text
specs/081-platform-grade-parser-mvp/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── schemas/
│       └── anchor-index.schema.json
└── checklists/
    └── requirements.md
```

### Source Code (repository root)

```text
packages/logix-anchor-engine/   # 新包：Node-only（Parser/Rewriter）
└── src/
    ├── Parser.ts               # 081：AnchorIndex 构建入口（public submodule）
    └── internal/**             # ts-morph/swc 细节实现（internal）

packages/logix-cli/             # 085：CLI（集成测试跑道，计划）
```

**Structure Decision**:

- `081/082` 的 build-time 引擎集中到 `packages/logix-anchor-engine`，避免把 `ts-morph/swc` 引入 `@logixjs/core`。
- `AnchorIndex@v1` 以 schema 固化在 `specs/081-*/contracts/schemas/*`，作为平台/CI/Devtools 的单一契约来源。

## Deliverables by Phase

- **Phase 0（research）**：明确 `ts-morph`/`swc` 的职责边界、子集边界裁决、reason codes 枚举（见 `research.md`）。
- **Phase 1（design）**：固化 `AnchorIndex@v1` schema 与数据模型（见 `contracts/` + `data-model.md`）。
- **Phase 2（tasks）**：实现 `packages/logix-anchor-engine/src/Parser.ts` + 单测；并由 085 CLI 做集成验证入口。

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation                  | Why Needed         | Simpler Alternative Rejected Because |
| -------------------------- | ------------------ | ------------------------------------ |
| [e.g., 4th project]        | [current need]     | [why 3 projects insufficient]        |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient]  |
