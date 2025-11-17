# Implementation Plan: UI Projection Contract（032：语义编排与 UI 投影解耦）

**Branch**: `032-ui-projection-contract` | **Date**: 2025-12-26 | **Spec**: `specs/032-ui-projection-contract/spec.md`  
**Input**: `specs/032-ui-projection-contract/spec.md`

## Summary

032 的目标是把“展示态/路由/弹框栈”等 presentation state 从 UI 本地状态里拔出来，升级为语义层（Scenario/Module）的状态与事件流：

- UI **只做投影**：只读“自身绑定模块实例”的公开状态；交互只通过派发该模块的事件/动作驱动语义层变化。
- 跨模块交互 **只允许** 通过语义边（事件 → 动作）表达（与 033 对齐），禁止 UI 直接跨模块写入。
- 为“预览解释执行”与“生产编译出码”两条消费路径提供同一份 **Binding Schema 事实源**，避免语义漂移。

本特性将用统一协议域 `@logix/module.*` 固化三个核心资产（都是可序列化、可 diff、可 versioned 的契约）：

- `@logix/module.presentationState@v1`：语义层的展示态模型（overlay/route/stack/focus/selection 等）
- `@logix/module.bindingSchema@v1`：UI 插头（props/events）↔ 逻辑插座（PortSpec/exports）的绑定协议
- `@logix/module.uiBlueprint@v1`：纯投影蓝图（布局/组件选择/坐标等），**不承载语义真相**
- `@logix/module.uiKitRegistry@v1`：UI Kit 事实源（组件目录 + props/events 形状 + tier 分层），供平台/Agent 做组件面板与补全；默认来自 IMD 的 registry 抽取（pro/ui/base）。

> 说明：PortSpec/TypeIR 的事实源在 035；语义蓝图（Scenario/IntentRule）在 033。032 只定义 UI 投影边界与 binding 语义。

## Technical Context

**Language/Version**: TypeScript 5.x（ESM）  
**Primary Dependencies**: `effect` v3、`@logix/core`、`@logix/react`、`@logix/sandbox`、React  
**Storage**: N/A（以可序列化 JSON 资产为主；编辑器/平台可选择其存储形态）  
**Testing**: Vitest（UI/交互测试可用普通 vitest；Effect-heavy 用 `@effect/vitest`）  
**Target Platform**: 现代浏览器（Workbench/Studio）+ Node.js（CI/出码/合同守卫）  
**Project Type**: pnpm workspace（`packages/*` + `examples/*`）  
**Performance Goals**:
- 不引入 runtime 热路径成本：032 仅影响平台/编辑期/出码期的协议与校验（NFR-001）
**Constraints**:
- UI 只读自身模块公开状态；跨模块展示需求必须通过语义层镜像/聚合（FR-003）
- 动态列表回填必须基于稳定行标识（`$rowId`/`rowRef`；与 033 对齐）
- 所有协议默认确定性、可序列化、可 diff（禁用随机/时间戳作为语义输入）
**Scale/Scope**: 先以 `examples/logix-sandbox-mvp` 作为最小 Workbench 验收载体；不交付 UI/Layout Editor 本体

## Constitution Check

*GATE: Phase 0 研究前必须通过；Phase 1 设计后再次复查。*

- **链路映射（Intent → Flow/Logix → Code → Runtime）**
  - 032 处于“平台语义层 ↔ UI 投影”边界：把 UI 行为收敛成“对语义层派发事件/动作”，并要求可回放/可验收（通过 031/036 的 trial-run 工件闭环）。
- **依赖/修改的 SSoT（docs-first）**
  - 端口/可引用空间事实源：`specs/035-module-ports-typeir/spec.md`
  - 语义蓝图与语义边：`specs/033-module-stage-blueprints/spec.md`
  - trial-run/IR/evidence 链路：`.codex/skills/project-guide/references/runtime-logix/logix-core/api/07-ir-pipeline-from-irpage.md`
- **IR & anchors（统一最小 IR + 稳定锚点）**
  - UI 投影协议不得引入第二套“语义真相源”；任何需要解释/回放的锚点必须可回指到语义蓝图（ruleId/instanceId/rowRef）。
- **Deterministic identity**
  - UIBlueprint 可包含布局信息，但不得把时间戳/随机写成默认字段；instanceId/rowId 等锚点必须稳定且可注入。
- **Transaction boundary**
  - 032 不引入事务窗口 IO；UI 交互到状态变更必须走语义层动作并回写到事务（与 runtime 不变量对齐）。
- **Diagnosability**
  - UI 绑定失败/越界引用必须可解释：至少包含 moduleId/instanceId、portRef 或 statePathRef、失败分类与修复建议。
- **Breaking changes**
  - 032 的协议演进一律通过 `@logix/module.*@vN` 版本化；不保留兼容层。
- **质量门槛（Pass 定义）**
  - 产物落地时：`pnpm typecheck`、`pnpm lint`、`pnpm test`（后续 tasks 阶段执行）

## Phases

### Phase 0（Research）：把“投影/绑定/展示态”变成可验收契约

- 明确 PresentationState 的最小覆盖面与确定性策略（overlay/route/stack 的边界与恢复语义）。
- 明确 BindingSchema 的“只读自身模块”约束：binding 的合法引用空间应仅来自 `@logix/module.portSpec@v1` 的 exports/ports（035）。
- 明确 UIBlueprint 与语义蓝图的关系：UIBlueprint 只允许通过 `instanceId` 绑定，不得携带跨模块依赖。

### Phase 1（Design & Contracts）：用 schema 固化 UI↔语义层边界

- 在 `specs/032-ui-projection-contract/contracts/schemas/` 固化：
  - `presentation-state.schema.json`（`@logix/module.presentationState@v1`）
  - `binding-schema.schema.json`（`@logix/module.bindingSchema@v1`）
  - `ui-blueprint.schema.json`（`@logix/module.uiBlueprint@v1`）
  - `ui-kit-registry.schema.json`（`@logix/module.uiKitRegistry@v1`；含 tier）
- 在 `data-model.md` 固化：UI 插头/逻辑插座的最小对接模型、越界失败语义、动态列表渲染与 rowRef 约束。
- 在 `quickstart.md` 写清：Workbench/平台如何用 PortSpec/TypeIR 生成补全与校验，并如何在解释执行与出码两条路径复用同一 BindingSchema。

### Phase 2（准备进入 `$speckit tasks`）

- 将协议落点拆成可执行任务（类型校验器、WorkBench 展示/编辑样例、CI 合同守卫样例）。

## Project Structure

### Documentation（本特性）

```text
specs/032-ui-projection-contract/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
    ├── schemas/
    └── examples/
```

### Source Code（预计相关目录；不在本阶段承诺实现）

```text
examples/logix-sandbox-mvp/
└── src/
    ├── ir/IrPage.tsx                # 现有：IR/Artifacts 最小展示（036 的 Workbench 载体）
    └── [planned] stage/             # 语义舞台 + UI 投影样例（绑定/只读自身模块）

packages/logix-sandbox/
└── src/
    └── [planned] workbench/         # 仅消费协议输出（不读 runtime 私有结构）
```

**Structure Decision**：

- 032 的核心交付是 **协议与数据模型**（schema + quickstart + 失败语义）；任何 UI 实现都应是“协议消费者”，可被替换/迁移。

## Complexity Tracking

无。若后续为了“更强 IDE/AST 保真”引入额外基础设施，必须登记其只作为编辑载体（不作为裁判）。
