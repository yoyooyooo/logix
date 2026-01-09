# Implementation Plan: Expression Asset Protocol（034：表达式/校验资产协议与 Sandbox 约束）

**Branch**: `034-expression-asset-protocol` | **Date**: 2025-12-26 | **Spec**: `specs/034-expression-asset-protocol/spec.md`  
**Input**: `specs/034-expression-asset-protocol/spec.md`

## Summary

034 的目标是把“code is truth”的表达式/校验逻辑，升级为平台可治理的资产协议：

- 编辑期：强类型补全 + 安全引用（只能引用可达端口/自身公开状态/允许服务）
- 保存期：固化 **规范化 IR + 显式 deps + 稳定 digest + 可序列化**（可 diff、可审阅）
- 预览期（sandbox）：确定性 + 预算/超时 + 可解释失败（非确定性/死循环/超大输出必须被拦截）
- Agent 参与出码：资产必须可被“稳定改写并验收”（不靠 LLM 自评，靠 031/036 工件闭环）

本特性将用统一协议域 `@logixjs/module.*` 固化一个可扩展的资产模型：

- `@logixjs/module.codeAsset@v1`：统一承载 expression/validator 两类资产（用 `kind` 区分）
- `@logixjs/module.deps@v1`：显式依赖清单（ports/exports/services/config 等）
- `@logixjs/module.reversibilityAnchor@v1`：可逆溯源锚点（可序列化；不影响运行语义）

> 说明：可引用空间与类型事实源在 035（PortSpec/TypeIR）；语义边/连线模型在 033；试运行 artifacts 槽位在 031；统一验收与 Agent 工具面在 036。

## Technical Context

**Language/Version**: TypeScript 5.x（ESM）  
**Primary Dependencies**: `effect` v3、`@logixjs/core`、`@logixjs/sandbox`、（表达式编辑器/平台侧）  
**Storage**: N/A（资产作为可序列化 JSON；平台可选择其存储与版本策略）  
**Testing**: Vitest（解析/归一化/依赖提取/预算裁剪应以纯函数单测为主）  
**Target Platform**: Node.js（CI/出码）+ 现代浏览器（预览/编辑）  
**Project Type**: pnpm workspace  
**Performance Goals**:
- 不触及运行时热路径：资产协议是编辑/出码/验收路径能力（NFR-001）
**Constraints**:
- 默认确定性：禁止随机/时间/环境读取作为语义输入；如需必须显式注入（FR-007）
- 黑盒允许但必须降级可治理：要求显式 deps/能力/预算，且仍可被 trial-run 工件约束（FR-011）
**Scale/Scope**:
- 先定义协议与 contracts；不在本阶段承诺某种具体表达式语言实现

## Constitution Check

*GATE: Phase 0 研究前必须通过；Phase 1 设计后再次复查。*

- **链路映射（Intent → Flow/Logix → Code → Runtime）**
  - 034 处于“语义蓝图（033）→ 资产（034）→ codegen → 运行行为”的中间层：资产提供可治理的事实层（deps/digest/预算），trial-run（031/036）提供运行期证据链作为裁判。
- **依赖/修改的 SSoT（docs-first）**
  - 033 StageBlueprint/IntentRule：`specs/033-module-stage-blueprints/spec.md`
  - 035 PortSpec/TypeIR：`specs/035-module-ports-typeir/spec.md`
  - 031 TrialRun artifacts：`specs/031-trialrun-artifacts/spec.md`
  - IR vs AST（Agent 出码闭环）：`docs/ssot/runtime/logix-core/concepts/04-ir-vs-ast-and-agent-coding.md`
- **IR & anchors**
  - 规范化 IR 必须可降解到统一最小 IR（至少能被 artifacts/ContextPack 消费），并保留 stable anchor 以支持 drift detection。
- **Deterministic identity**
  - `digest` 必须由规范化 IR 稳定派生；不得掺入时间戳/随机盐（除非显式版本化并可复现）。
- **Transaction boundary**
  - 资产执行（预览）必须在受控 sandbox 内；禁止引入事务窗口 IO/异步逃逸。
- **Diagnosability**
  - 失败必须可解释：缺失依赖/越界引用/非确定性违规/超时/超预算等必须分类输出最小上下文。
- **Breaking changes**
  - 资产协议演进通过 `@logixjs/module.*@vN` 版本化；不保留兼容层。
- **质量门槛（Pass 定义）**
  - 产物落地时：`pnpm typecheck`、`pnpm lint`、`pnpm test`（后续 tasks 阶段执行）

## Phases

### Phase 0（Research）：确定“可解析子集 vs 黑盒”与 deps 提取边界

- 定义 **依赖模型**：ports/exports/services/config 的最小集合与地址格式（与 035 对齐）。
- 定义 **可解析子集** 的规范化 IR 形状：目标是“可 diff/可重写/可判定”，而不是“保真还原 TS AST”。
- 定义 **黑盒降级**：不可解析资产的必填字段（显式 deps/能力/预算/输出摘要），以及 platform 的限制（禁结构编辑、仅允许运行/展示）。

### Phase 1（Design & Contracts）：固化 CodeAsset/Deps/Anchor schema

- 在 `specs/034-expression-asset-protocol/contracts/schemas/` 固化：
  - `code-asset.schema.json`（`@logixjs/module.codeAsset@v1`）
  - `deps.schema.json`（`@logixjs/module.deps@v1`）
  - `reversibility-anchor.schema.json`（`@logixjs/module.reversibilityAnchor@v1`）
- 在 `data-model.md` 固化：
  - `CodeAsset` 的最小字段与语义（source/normalizedIr/deps/digest/budgets/capabilities）
  - deps 的地址空间与 035 PortSpec/TypeIR 的对齐方式
  - sandbox 约束与失败分类（可解释、可裁剪）
- 在 `quickstart.md` 写清：
  - 如何从 PortSpec/TypeIR 生成“允许引用空间”
  - 如何保存资产并生成 digest
  - 如何把 asset 与 033 的 IntentRule/EdgeMapping 连接，并通过 036 形成闭环验收

### Phase 2（准备进入 `$speckit tasks`）

- 将解析/归一化/依赖提取/预算裁剪/错误分类拆成可执行任务，并补齐最小回归用例（包括故意违规用例）。

## Project Structure

### Documentation（本特性）

```text
specs/034-expression-asset-protocol/
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
packages/logix-sandbox/
└── src/
    └── [planned] assets/          # sandbox 预览执行壳（预算/超时/确定性约束）

examples/logix-sandbox-mvp/
└── src/
    └── [planned] editor/          # 表达式编辑/保存样例（仅做协议消费者）
```

**Structure Decision**：

- 资产协议与其校验/归一化应尽量做成纯函数与 schema 驱动，便于被 Workbench/CI/Agent 复用。

## Complexity Tracking

无。若后续需要引入 TS AST/formatter，仅允许作为“源码编辑载体”（不作为运行/验收事实源）。
