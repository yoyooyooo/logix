# Implementation Plan: Module Reference Space（035：模块引用空间事实源）

**Branch**: `035-module-reference-space` | **Date**: 2025-12-26 | **Spec**: `specs/035-module-reference-space/spec.md`  
**Input**: `specs/035-module-reference-space/spec.md`

## Summary

035 的目标是定义平台“模块引用空间事实源”的唯一真相源：既包含 **引用空间导出**（`ModulePortSpec@v1` / `TypeIR@v1`），也包含 **引用载体协议**（`CodeAsset@v1` / `Deps@v1` / `ReversibilityAnchor@v1`）。

其中 PortSpec/TypeIR 通过 031 的 TrialRunReport.artifacts 槽位导出（按预算裁剪），统一用协议域 `@logixjs/module.*` 版本化：

- `@logixjs/module.portSpec@v1`：模块端口与可引用空间（actions/events/outputs/exports）
- `@logixjs/module.typeIr@v1`：与 PortSpec 对齐的类型摘要/引用 IR（可截断）

表达式/校验资产统一落在：

- `@logixjs/module.codeAsset@v1`：表达式/校验资产（source + normalizedIr + deps + digest + budgets/capabilities + anchor）
- `@logixjs/module.deps@v1`：显式依赖（reads/services/configs）
- `@logixjs/module.reversibilityAnchor@v1`：可逆溯源锚点（不影响运行语义）

平台（Scenario Canvas、表达式编辑器、lint/CI、Agent 工具面）必须 **只依赖** 这些版本化工件/协议做补全、校验与验收，避免源码推断形成并行真相源。

## Technical Context

**Language/Version**: TypeScript 5.x（ESM）  
**Primary Dependencies**: `effect` v3、`@logixjs/core`（导出端口与类型信息）、`@logixjs/sandbox`（作为最小消费者/执行壳）  
**Storage**: N/A（以可序列化 JSON 工件为主，可被平台/CI 存档）  
**Testing**: Vitest（导出/归一化/diff 建议以纯函数 + 单测为主）  
**Target Platform**: Node.js（CI/脚本）+ 现代浏览器（Workbench/Studio）  
**Project Type**: pnpm workspace  
**Performance Goals**:

- 不影响运行时热路径：PortSpec/TypeIR 只在 trial-run/inspection 路径导出（NFR-001）
  **Constraints**:
- 输出确定性：稳定排序/稳定字段；禁止时间戳/随机（FR-005）
- 预算/截断显式：TypeIR 超限必须标注 `truncated` 并携带摘要（FR-004）
- 单项失败不阻塞：在 031 的 artifacts 语义下，失败必须可解释且不静默覆盖（FR-006）
  **Scale/Scope**:
- v1 先保证 key 空间与 exports 可用；TypeIR 可分阶段演进（Out of Scope 对齐）

## Constitution Check

_GATE: Phase 0 研究前必须通过；Phase 1 设计后再次复查。_

- **链路映射（Intent → Flow/Logix → Code → Runtime）**
  - 035 是平台侧“模块引用空间事实源”：引用空间（PortSpec/TypeIR）由 trial-run 从最终可运行模块对象导出；引用载体（CodeAsset）在保存期固化为可治理事实层；运行时不读取这份协议。
- **依赖/修改的 SSoT（docs-first）**
  - 031 artifacts 槽位与 Envelope：`specs/031-trialrun-artifacts/spec.md`
  - 036 集成验收口径：`specs/036-workbench-contract-suite/spec.md`
  - IR 全链路（IrPage→TrialRun）：`docs/ssot/runtime/logix-core/api/07-ir-pipeline-from-irpage.md`
- **IR & anchors**
  - PortSpec/TypeIR 必须可与 Manifest/StaticIR 同源对照（moduleId/actionKeys 对齐），避免 drift。
- **Deterministic identity**
  - 类型/端口导出不得默认引入随机 digest；如需 digest，必须由稳定字段派生。
- **Transaction boundary**
  - 仅发生在 trial-run/inspection；禁止把导出逻辑塞进事务窗口或常驻观测路径。
- **Diagnosability**
  - 缺失/截断/失败必须给出结构化原因（moduleId + artifactKey + budget/失败分类）。
- **Breaking changes**
  - 协议演进通过 `@logixjs/module.*@vN`；破坏性变更必须能在 CI/Workbench diff 中被识别并审阅。
- **质量门槛（Pass 定义）**
  - 产物落地时：`pnpm typecheck`、`pnpm lint`、`pnpm test`（后续 tasks 阶段执行）

## Phases

### Phase 0（Research）：确定 PortSpec/TypeIR 的最小可用形状与截断策略

- 明确 PortSpec 的端口分类与寻址方式（action/event/output/export path），以及稳定排序规则。
- 明确 TypeIR 的投影策略：默认“扁平、具体、可 diff”，超预算截断但仍可用于 key-level 校验。
- 明确 TypeIR 的实现来源：允许内部利用 `effect/Schema` 的 `schema.ast`（SchemaAST）做类型投影，但 SchemaAST **不外泄为协议**；对外只有 `@logixjs/module.typeIr@v1`（与 040 对齐）。
- 明确与 031 ArtifactEnvelope 的组合方式：payload schema 如何被消费者验证（只在 `ok=true` 时校验 `value`）。
- 明确 CodeAsset 的治理边界：parseable 子集 vs blackbox 降级；deps/digest/预算/能力的最小集合与验收口径。

### Phase 1（Design & Contracts）：固化 schema 与 diff 口径

- 在 `specs/035-module-reference-space/contracts/schemas/` 固化：
  - `module-port-spec.schema.json`（PortSpec payload；对应 key `@logixjs/module.portSpec@v1`）
  - `type-ir.schema.json`（TypeIR payload；对应 key `@logixjs/module.typeIr@v1`）
  - `port-address.schema.json`（端口/路径寻址基元；供 032/033/036 引用）
  - `code-asset.schema.json`（`CodeAsset@v1`；expression/validator）
  - `code-asset-ref.schema.json`（`CodeAssetRef@v1`；digest 引用）
  - `deps.schema.json`（`Deps@v1`）
  - `reversibility-anchor.schema.json`（`ReversibilityAnchor@v1`）
- 在 `data-model.md` 固化：
  - PortSpec/TypeIR 的字段语义与对齐规则
  - CodeAsset/Deps/Digest/Anchor 的字段语义与治理边界
  - diff 的“破坏性判定”输入域（删除端口、收缩 exports、类型变更）
- 在 `quickstart.md` 写清：
  - Workbench/CI 如何导出并消费 PortSpec/TypeIR（外链 031/036）
  - 资产保存期如何固化 `normalizedIr + deps + digest`，以及黑盒降级的门禁
  - 当 TypeIR 缺失或截断时，平台如何降级为 key-level 校验

### Phase 2（准备进入 `$speckit tasks`）

- 将导出实现、schema 校验、以及合同守卫样例拆成可执行任务。

## Project Structure

### Documentation（本特性）

```text
specs/035-module-reference-space/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
    └── schemas/
```

### Source Code（预计相关目录；不在本阶段承诺实现）

```text
packages/logix-core/
└── src/
    └── [planned] reflection/ports/     # 从最终 module 对象导出 PortSpec/TypeIR（只在 trial-run 路径）

examples/logix-sandbox-mvp/
└── src/
    └── ir/IrPage.tsx                   # 最小消费者（可展示 artifacts）
```

**Structure Decision**：

- PortSpec/TypeIR 的导出/归一化/diff，以及 CodeAsset 的 normalize/deps/digest/preview，优先做成纯函数 + schema 驱动，以便被 Workbench/CI/Agent 复用。

## Complexity Tracking

无。若 TypeIR 需要引入复杂类型系统（泛型展开/递归展开策略），必须明确预算与截断口径并可测试。
