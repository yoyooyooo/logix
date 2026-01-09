# Implementation Plan: Platform-Grade Rewriter MVP（082）

**Branch**: `082-platform-grade-rewriter-mvp` | **Date**: 2026-01-09 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `specs/082-platform-grade-rewriter-mvp/spec.md`

## Summary

交付一个 Node-only 的 Platform-Grade Rewriter MVP：基于 `081` 的 AnchorIndex（缺口点/插入点）与补全候选，生成可审阅的 `PatchPlan@v1`，并在安全边界内写回源码锚点字段。

核心门槛：

- report-only 与 write-back 双模式；
- 幂等、最小 diff、确定性；
- 任何歧义/冲突/子集外形态必须显式失败或降级（宁可失败不 silent corruption）。

## Questions Digest（外部问题清单回灌）

来源：外部问题清单通过 `$speckit plan-from-questions` 贴入（本段只记录裁决，不记录全文）。

- Q018：write-back 必须防竞态：plan→write 间校验目标文件未变化（`expectedFileDigest`），变化则 fail（禁止强行覆盖）。
- Q019：风格策略以“最小 diff + 尽量保持文件风格”为准：不强制 Prettier；必要时探测缩进/换行/尾逗号策略并保持。
- Q020：变量中转/动态组合的目标对象统一降级（report-only 或 fail），不做跨引用跳转回写。
- Q021：幂等定义为“字节级无变化”：write-back 后再次运行应产生 0 diff（文件内容不变）。

## Deepening Notes（关键裁决）

- Decision: 幂等以“字节级无变化”为标准（source: spec Clarifications AUTO + Q021）。
- Decision: plan→write 竞态必须 fail：write-back 前校验 `expectedFileDigest`，不一致禁止强行覆盖（source: spec Clarifications AUTO + Q018）。
- Decision: 最小 diff + 风格保持：不强制全文件 reprint/format；做不到就拒绝写回（source: spec Clarifications AUTO + Q019）。
- Decision: 变量中转/动态组合统一降级（report-only 或 fail），不做跨引用回写（source: Q020）。

## Technical Context

**Language/Version**: TypeScript（workspace：5.8.2；以 `package.json` 为准）  
**Primary Dependencies**: `effect` v3、Node-only：`ts-morph`（AST 编辑/写回）、（可选）`swc`（print/辅助分析）  
**Storage**: 文件写回（源码锚点字段）；其余输出为 JSON 工件  
**Testing**: Vitest（以“幂等/最小 diff/失败语义”作为核心用例）；集成测试由 085 CLI 承担  
**Target Platform**: Node.js 20+  
**Project Type**: pnpm workspace（packages）  
**Performance Goals**: N/A（不触及 runtime 热路径）  
**Constraints**: 单一真相源（必须写回源码）、宁可漏不乱补、确定性/可序列化/可 diff、禁止 silent corruption

## Constitution Check

- **Intent → Flow/Logix → Code → Runtime**：本特性处在“平台→代码回写”的闭环能力；其目的只是补齐 Platform-Grade 锚点字段，不改变业务计算语义。
- **Docs-first & SSoT**：回写范围必须与 Platform-Grade 子集与统一最小 IR 的裁决一致；写回契约以 schema version 化固化（见 `contracts/schemas/*`）。
- **Single truth source**：写回后源码锚点字段即权威；不得生成长期 sidecar 真相源。
- **Determinism**：补丁与报告必须稳定可复现；禁止时间戳/随机作为主键；必要的耗时字段默认不输出。
- **Safety**：遇到不确定/歧义/冲突必须拒绝写回；report-only 必须能完整解释原因。
- **Forward-only**：任何破坏性回写行为需要迁移说明（例如“缺失锚点升级为门禁失败”）。

## Design

### 1) PatchPlan@v1（可审阅写回计划）

- 契约落点：`specs/082-platform-grade-rewriter-mvp/contracts/schemas/patch-plan.schema.json`
- 语义：
  - `operations[]`：每条是“对某文件某插入点写入某字段”的最小操作；
  - `mode`：`report` 或 `write`；
  - `reasonCodes`：每条 operation / skip / fail 都必须带原因；
  - `safety`：明确风险等级与为何仍可写回（只允许高置信度）。
  - `expectedFileDigest?`：write-back 竞态防线：plan 生成时记录目标文件内容 digest；write-back 前必须校验一致，否则 fail（Q018）。

### 2) WriteBackResult@v1（执行结果 + 幂等性）

- 契约落点：`specs/082-platform-grade-rewriter-mvp/contracts/schemas/writeback-result.schema.json`
- 必须包含：
  - `modifiedFiles[]`：哪些文件被改动；
  - `skipped[]`：哪些目标被跳过（含 reason）；
  - `failed[]`：哪些目标失败（含 reason）；
  - `idempotent`：是否第二次运行应产生 0 diff 的判定摘要（可用 `expectedNoopAfterWrite=true` 等字段表达）。

### 3) 最小 diff 与“拒绝写回”的硬门槛

- 最小 diff：
  - 仅允许新增缺失字段，不允许重排已有字段/对象结构；
  - 不改变作者已有声明：`services: {}` 视为显式声明，禁止写回覆盖。
  - 风格保持：尽量保持原文件的缩进/换行/尾逗号策略；插入代码必须局部、可读、可审阅（Q019）。
- 拒绝写回（Hard Fail）：
  - 子集外形态或无法确定插入点；
  - 多个候选插入点/存在歧义；
  - 无法确定 serviceId/moduleId（且需要它才能写回）；
  - 任何会导致 rewriter 需要改动业务语句的情况。
  - plan→write 间文件内容变化（digest 不一致）：必须 fail（禁止强行覆盖；Q018）。

## Perf Evidence Plan

N/A（Node-only 工具链；不触及 runtime 热路径）。

## Project Structure

### Documentation (this feature)

```text
specs/082-platform-grade-rewriter-mvp/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── schemas/
│       ├── patch-plan.schema.json
│       └── writeback-result.schema.json
└── checklists/
    └── requirements.md
```

### Source Code (repository root)

```text
packages/logix-anchor-engine/
└── src/
    ├── Rewriter.ts            # 082：回写入口（public submodule）
    └── internal/**            # ts-morph/swc 细节实现（internal）

packages/logix-cli/            # 085：CLI（集成测试跑道，计划）
```

**Structure Decision**:

- 回写能力集中在 Node-only 引擎包 `packages/logix-anchor-engine`，避免污染 runtime。
- 写回与报告的协议通过 schema 固化，便于 CI/平台/Devtools 统一消费与门禁化。

## Deliverables by Phase

- **Phase 0（research）**：明确“最小 diff”的具体规则、失败语义与 reason code 集（见 `research.md`）。
- **Phase 1（design）**：固化 PatchPlan/WriteBackResult 的 schema 与数据模型（见 `contracts/` + `data-model.md`）。
- **Phase 2（tasks）**：实现 rewriter + 单测；并由 085 CLI 暴露 report-only/write-back 子命令用于集成验证。

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation                  | Why Needed         | Simpler Alternative Rejected Because |
| -------------------------- | ------------------ | ------------------------------------ |
| [e.g., 4th project]        | [current need]     | [why 3 projects insufficient]        |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient]  |
