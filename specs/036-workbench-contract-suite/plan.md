# Implementation Plan: Workbench Contract Suite（036：031-035 统一验收入口 + Agent 工具面草案）

**Branch**: `036-workbench-contract-suite` | **Date**: 2025-12-26 | **Spec**: `specs/036-workbench-contract-suite/spec.md`  
**Input**: `specs/036-workbench-contract-suite/spec.md`

## Summary

036 的定位是“集成/治理入口”，它不重写 031-035 的协议细节，而是把它们收束成一条可签收闭环：

- 在 `examples/logix-sandbox-mvp`（Workbench）里，对代表性模块做一次受控检查；
- 产出（或降级产出）一组版本化、可序列化的工件（TrialRunReport + artifacts + 相关 IR）；
- 计算一个统一的 PASS/WARN/FAIL（Integrated Verdict），并给出可行动的降级/失败原因；
- 该闭环既服务人审/CI，也作为未来平台引入 Agent 的“客观反馈回路”。

同时补进一个上帝视角的规划点：平台引入 Agent 后，Agent 最终一定要输出代码；但收敛过程不应依赖“LLM 自评”，而应依赖 **IR-first 的工具面**：

- 平台把“可引用空间 / 资产依赖 / 预算约束 / 诊断证据”以稳定 JSON 工件喂给 Agent；
- 平台可额外提供 `@logix/module.uiKitRegistry@v1`（组件目录 + tier）作为“可选事实源”，让 Agent 生成 UI 投影代码时不必读取组件库源码；
- Agent 产出/改写代码；
- 平台用 `trialRun + artifacts + diff + evidence` 形成可复现的判定与诊断，再驱动 Agent 迭代。

## Technical Context

**Language/Version**: TypeScript 5.x（ESM；pnpm workspace）  
**Primary Dependencies**: `effect` v3、`@logix/core`、`@logix/sandbox`、`@logix/react`、React（Workbench UI）  
**Storage**: N/A（以可序列化 JSON 工件为主；Workbench 可导出下载，CI 可存档到 artifact store）  
**Testing**: Vitest（含 `@effect/vitest` 约定）、TypeScript typecheck、ESLint  
**Target Platform**: Node.js（CI/脚本）+ 现代浏览器（Workbench）  
**Project Type**: pnpm monorepo（`packages/*` + `examples/*`）  
**Performance Goals**:
- 不触及运行时热路径：所有导出/验收/Agent 工具均为按需路径（NFR-001，`specs/036-workbench-contract-suite/spec.md:106`）
- 统一判定与对比必须是 O(工件体积) 量级，且输出确定性（NFR-002，`specs/036-workbench-contract-suite/spec.md:107`）
**Constraints**:
- 统一最小 IR（Static IR + Dynamic Trace）；稳定锚点（instanceId/txnSeq/opSeq/runId）不得默认随机化（见 `.specify/memory/constitution.md`）
- 预算/截断语义必须显式且可解释（maxBytes/maxEvents；Oversized/Truncated 都要可行动）
- Workbench 只消费稳定协议输出，禁止读取 runtime 私有结构当事实源（FR-005，`specs/036-workbench-contract-suite/spec.md:102`）
**Scale/Scope**: 以“代表性模块”与“多工件降级验收”优先，暂不追求全量 schema 覆盖动态 Trace 的每个子类型（Out of Scope，`specs/036-workbench-contract-suite/spec.md:40`）

## Constitution Check

*GATE: Phase 0 研究前必须通过；Phase 1 设计后再次复查。*

- **链路映射（Intent → Flow/Logix → Code → Runtime）**
  - 本特性属于平台/治理的“验收与证据链”层：以 TrialRun/Artifacts 的 IR 作为事实源，连接“模块代码形态 → 可运行形态 → 可解释证据 → 可审阅判定”。
- **依赖/修改的 SSoT 文档（docs-first）**
  - 036 直接依赖 `specs/031-*` ～ `specs/035-*`，自身不新增协议字段（只定义集成验收口径）。
  - IR/TrialRun 链路实现视角参考：`.codex/skills/project-guide/references/runtime-logix/logix-core/api/06-reflection-and-trial-run.md`、`.codex/skills/project-guide/references/runtime-logix/logix-core/api/07-ir-pipeline-from-irpage.md`。
- **契约变更范围**
  - 036 不要求修改 `@logix/core` 的公共契约；若需要新增“Contract Suite Verdict”作为可存档工件，应以版本化 schema 落在 `specs/036-*/contracts/schemas/*`，并明确其仅为治理层输出。
- **IR & anchors（统一最小 IR + 稳定锚点）**
  - 不引入新的并行真相源：Integrated Verdict 必须完全可由 TrialRunReport/artifacts/PortSpec/TypeIR 等工件推导，并在输出中保留最小可解释指针（artifactKey/code/pointer）。
- **Deterministic identity**
  - 验收与 diff 的输出不得默认包含时间戳/随机/机器特异信息；runId 必须可注入；若工件包含 createdAt/timestamp，仅作为附属信息，不得成为判定/稳定摘要的输入。
- **Transaction boundary**
  - 本特性不触及事务窗口内行为；所有检查/导出发生在 trial-run/inspection 路径。
- **Internal contracts & trial runs**
  - Agent 工具面必须是显式、可版本化的 JSON 协议；不得通过读取 runtime 内部字段或全局单例来“偷信息”。
- **Performance budget**
  - hot path：无；按需路径：trial-run 与 artifacts 导出必须受预算/超时控制；Integrated Verdict 计算必须是线性并可预测。
- **Diagnosability & explainability**
  - 集成验收失败/降级必须以结构化原因输出（缺失工件、预算/截断、版本不匹配、越界引用等），并能回指到 evidence/diagnostic（如存在）。
- **Breaking changes**
  - 036 本身不引入对外 API；若 031-035 的协议发生破坏式演进，一律通过版本化 key/协议升级承载。
- **Public submodules**
  - 若后续实现需要在 `packages/*` 新增对外入口，遵守 `packages/*` 的 public submodules 规则（见 `.specify/memory/constitution.md`）。
- **质量门槛（Pass 定义）**
  - 变更落地时：`pnpm typecheck`、`pnpm lint`、`pnpm test`；并补齐与 Contract Suite Verdict/降级规则相关的单测（至少纯函数层）。

## Phases（初步拆解）

### Phase 0（Research）：把“Agent 参与出码”转成可控闭环

- 明确 031-035 在 Workbench 侧的最小“代表性模块”样例集合与输出工件清单。
- 明确 Integrated Verdict 的输入域：哪些工件缺失时可降级、哪些必须 FAIL（不定优先级，先把规则写清）。
- 明确 Agent 工具面的最小集合（不做实现承诺，只固化接口与 contracts）：
  - Context Pack（可引用空间 + deps/digest + budgets）
  - Trial Run（受控执行 + 工件导出）
  - Diff（前后版本可审阅）
  - Evidence Query（按锚点过滤 debug/event）

### Phase 1（Design & Contracts）：用 schema 固化“平台↔Agent↔验收”的边界

- 在 `specs/036-*/contracts/schemas` 固化：
  - `ContractSuiteVerdict@v1`（PASS/WARN/FAIL + reasons + per-artifact 状态）
  - `ContractSuiteContextPack@v1`（给 Agent 的最小事实包：工件 + 缺口/预算/降级说明 + 可选 inputs：StageBlueprint/UIBlueprint/BindingSchema/CodeAsset）
- 在 `data-model.md` 固化：Integrated Verdict 的判定与降级模型（可从 031-035 的边界推导）。
- 在 `quickstart.md` 写清：Workbench/CI/Agent 三种入口如何复用同一套工件与判定逻辑（不引入第二事实源）。

### Phase 2（准备进入 `$speckit tasks`）

- 将 Phase 1 的 schema 与数据模型拆成可执行任务（实现 Workbench UI、纯函数判定器、CI 入口、回归用例）。

## Project Structure

### Documentation（本特性）

```text
specs/036-workbench-contract-suite/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── reading-cheatsheet.md
├── semantic-ui-port-bridge.md
├── contracts/
│   └── schemas/
└── tasks.md
```

### Source Code（预计相关目录；不定优先级）

```text
packages/logix-sandbox/
└── src/
    ├── client.ts                 # 现有：Host ↔ Worker
    ├── service.ts                # 现有：Effect Layer wrapper
    └── [planned] contract-suite/ # 纯函数判定 + 工件归一化 + ContextPack 生成（可被 Workbench/CI 复用）

examples/logix-sandbox-mvp/
└── src/
    ├── ir/IrPage.tsx             # 现有：最小 IR 展示
    └── [planned] contract-suite/ # Workbench 消费：一键检查 + 展示 verdict/工件/降级原因
```

**Structure Decision**:

- 将“Integrated Verdict/降级规则/ContextPack 归一化”尽量做成纯函数（可复用、可单测、可被 CI 调用）。
- Workbench 作为消费者，只负责：触发 trial-run、展示/导出工件与 verdict；不得读取 runtime 私有结构当事实源。

## Complexity Tracking

无。当前规划不引入新的热路径复杂度与跨包耦合；若后续为了复用而新增 package，需要在此登记理由与替代方案。
