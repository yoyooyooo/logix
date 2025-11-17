# Implementation Plan: TrialRun Artifacts（031：artifacts 槽位 + RulesManifest 首用例）

**Branch**: `031-trialrun-artifacts` | **Date**: 2025-12-26 | **Spec**: `specs/031-trialrun-artifacts/spec.md`  
**Input**: `specs/031-trialrun-artifacts/spec.md`

## Summary

031 的目标是把 “Trial Run / inspection” 的输出升级为平台可消费的 **统一 artifacts 槽位**：

- `TrialRunReport.artifacts?: Record<artifactKey, ArtifactEnvelope>`：承载各 feature kit 的补充静态 IR（首个用例：Form 的 RulesManifest）。
- artifacts 必须满足：**可序列化（JsonValue）/确定性/预算受控/单项失败不阻塞**。
- 平台侧（最小消费者：`examples/logix-sandbox-mvp` 的 `/ir`）能展示/导出 artifacts，为后续 036 Contract Suite 与 Agent 闭环提供事实源。
- 后续同一槽位将承载“平台引用空间事实源”（如 035 的 `@logix/module.portSpec@v1`、`@logix/module.typeIr@v1`），避免平台侧用 AST/源码推断制造并行真相源。

## Technical Context

**Language/Version**: TypeScript 5.x（ESM）  
**Primary Dependencies**: `effect` v3、`@logix/core`、`@logix/form`、`@logix/sandbox`  
**Storage**: N/A（以可序列化 JSON 工件为主，可导出/存档）  
**Testing**: Vitest（必要时使用 `@effect/vitest`）  
**Target Platform**: Node.js（CI/脚本）+ 现代浏览器（Sandbox Workbench）  
**Project Type**: pnpm workspace（`packages/*` + `examples/*`）  
**Performance Goals**:
- 不触及热路径：artifacts 仅在 trial-run/inspection 入口按需计算（默认不分配、不录制）。
- 默认预算：每个 artifact ≤ 50KB；超限必须截断并显式标注（不允许静默丢失）。
**Constraints**:
- JsonValue 硬门：跨宿主输出必须可 JSON 序列化（复用 005）。
- key 必须概念化（契约域命名），不得使用实现包名前缀（避免并行真相源）。
- 确定性：稳定排序、禁止时间戳/随机/机器特异信息进入 artifact payload。
- 单项失败不阻塞：某个导出者失败/不可序列化时，仍需产出 TrialRunReport 并标注失败。
**Scale/Scope**: 只覆盖 inspection 链路；不引入 Trace/EffectOp 的全量协议（由其它 specs 版本化推进）。

## Constitution Check

*GATE: Phase 0 研究前必须通过；Phase 1 设计后再次复查。*

- **链路映射（Intent → Flow/Logix → Code → Runtime）**：本特性属于“Runtime/平台的反射与证据链”层，连接模块代码 → Trial Run → 可序列化 artifacts（供 Studio/CI/Agent 消费）。
- **依赖/修改的 SSoT（docs-first）**：
  - 统一最小 IR 与 TrialRun/Reflection：`.codex/skills/project-guide/references/runtime-logix/logix-core/api/06-reflection-and-trial-run.md`
  - 端到端链路（IrPage）：`.codex/skills/project-guide/references/runtime-logix/logix-core/api/07-ir-pipeline-from-irpage.md`
  - RulesManifest schema 事实源：`specs/028-form-api-dx/contracts/schemas/rules-manifest.schema.json`
- **IR & anchors**：artifacts 本质是 Supplemental Static IR，必须可被 036 的 Integrated Verdict 消费；key/version 必须稳定。
- **Deterministic identity**：artifacts 不引入新的随机 id；如需 digest，必须由结构字段稳定派生。
- **Transaction boundary**：artifacts 导出必须是按需的只读路径；不得在事务窗口触发 IO。
- **Internal contracts & trial runs**：导出者注册与收集必须是显式扩展点（可 mock/可测试），禁止通过全局单例“偷挂”。
- **Performance budget**：仅影响按需路径；必须在 plan/task 中声明预算与截断策略，并确保默认关闭时零成本。
- **Diagnosability**：单项失败/冲突/截断必须以结构化方式呈现（moduleId + artifactKey + error）。
- **Breaking changes**：若 TrialRunReport 的 shape 演进导致 consumers 破坏，必须通过版本化 key 与迁移说明承载（不做兼容层）。
- **Public submodules**：若新增对外入口或子路径，遵守 030 的 public submodules 规则。
- **质量门槛（Pass 定义）**：落地时至少通过 `pnpm typecheck`、`pnpm lint`、`pnpm test`；并补齐 contracts/schema 预检用例。

## Phases

### Phase 0（Research）

- 明确 artifacts 的 canonical shape（是否使用 Envelope、如何表达 errors/truncation）。
- 明确 key 命名规则（概念域）与校验正则/约束。
- 明确与现有 TrialRunReport（025）与 EvidencePackage（020/005）如何组合（避免并行事实源）。

### Phase 1（Design & Contracts）

- 固化 031 的 contracts（artifactKey / ArtifactEnvelope / TrialRunArtifacts）。
- 固化 `@logix/form.rulesManifest@v1` artifact 的 schema（复用 028 的 RulesManifest）。
- 写 quickstart：Workbench/CI 如何导出 artifacts 并展示。

### Phase 2（Tasks）

- 通过 `$speckit tasks 031` 拆成可执行任务（core 扩展点、form 导出者、sandbox 展示与回归用例）。

## Project Structure

### Documentation（本特性）

```text
specs/031-trialrun-artifacts/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── schemas/
└── tasks.md
```

### Source Code（预计相关目录）

```text
packages/logix-core/
└── src/internal/observability/
    ├── trialRunModule.ts         # TrialRunReport 组装（计划扩展 artifacts）
    ├── evidenceCollector.ts      # 证据导出（不直接承载 artifacts，但需对齐 budgets/JsonValue）
    └── [planned] artifacts/      # artifacts 导出注册/收集扩展点（纯 JSON/预算受控）

packages/logix-form/
└── src/internal/form/
    ├── impl.ts                   # rulesManifest() / warnings（现有能力）
    └── [planned] artifacts.ts    # 将 RulesManifest 挂接到 031 artifacts 槽位

packages/logix-sandbox/
└── src/
    ├── Client.ts / Service.ts    # Host ↔ Worker（间接携带 stateSnapshot）
    └── internal/worker/sandbox.worker.ts

examples/logix-sandbox-mvp/
└── src/ir/IrPage.tsx             # 最小消费者（计划增加 artifacts viewer / 下载）
```

## Complexity Tracking

无。所有导出能力均为按需路径；若实现阶段不得不引入全局 registry 或额外常驻缓存，必须在此登记并给出替代方案与退出计划。
