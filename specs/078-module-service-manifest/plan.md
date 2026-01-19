# Implementation Plan: 078 Module↔Service 关系纳入 Manifest IR（平台可诊断/可回放）

**Branch**: `078-module-service-manifest` | **Date**: 2026-01-09 | **Spec**: `specs/078-module-service-manifest/spec.md`  
**Input**: Feature specification from `specs/078-module-service-manifest/spec.md`

## Summary

目标：把“模块输入服务依赖（端口名 → 稳定 ServiceId）”纳入可序列化、可 diff 的 Manifest IR，并把它接入试运行报告与 Devtools 解释链路。

交付思路（分层）：

1. **Static IR（Manifest）**：扩展 `ModuleManifest`，导出 `servicePorts`（端口名 + ServiceId），并纳入 digest 与 diff。
2. **Trial Run（环境对齐）**：在试运行中对 `servicePorts` 做“声明 ↔ 实际可 resolve”对齐检查，输出结构化缺失/冲突报告（最小字段集，Slim/可序列化）。
3. **Devtools（解释）**：提供 moduleId→servicePorts 的查询入口，并在 Devtools UI 中展示模块依赖视图（按模块/按服务双向索引）。

## Questions Digest（外部问题清单回灌）

来源：外部问题清单通过 `$speckit plan-from-questions` 贴入（本段只记录裁决，不记录全文）。

- Q001：`ServiceId` 严格稳定：仅允许 `tag.key/id/_id`；`toString()` 仅诊断用途；不合格 Tag 视为契约违规（降级/失败，禁止写入 IR）。
- Q002：`servicePorts` 提取基于运行时反射（ModuleDef 对象）；“加载即副作用”的治理由 `025/085` 的受控试跑/CLI 承担，不在 078 内用 AST。
- Q003：支持显式 `optional` 服务端口：optional 缺失不 hard-fail，但必须可解释定位；默认 required。
- Q004：`manifestVersion` 手动 bump（由维护者按 contract/schema 演进维护，并用测试/门禁兜底），不做自动 hash 版本。
- Q005：沿用 `budgets.maxBytes`；`servicePorts` 属关键字段，裁剪优先级最低；超限需显式截断并标记，保持确定性。

## Deepening Notes（关键裁决）

- Decision: `ServiceId` 必须来自 `Context.Tag` 的显式稳定字符串标识（优先 `tag.key` / 其次 `tag.id` / 再 `tag._id`）；禁止把 `toString()` 作为 IR 的 ServiceId 来源；并通过一个唯一实现的 helper 统一（避免多处漂移）。
- Decision: `servicePorts` 是“输入依赖端口”，由模块声明；运行时不会自动推断依赖，平台不做反编译。
- Decision: 支持显式 optional 端口（`optional=true`）：缺失不作为 hard-fail 依据，但仍导出与对齐报告（用于解释与提示）。
- Decision: 端口名默认约定 `port = serviceId`，仅在需要更强解释/语义区分时再使用短别名（例如 `archiver` / `backupSvc`）。
- Decision: 默认运行档位不付反射税：Manifest/对齐检查/索引都应为显式调用或 dev-only 注册；prod 默认不常驻增长内存。
- Decision: Manifest 变更以 `manifestVersion` bump + digest 变更作为“可门禁化”的硬锚点；diff 输出必须稳定（排序/去重/字段裁剪一致）。
- Decision: KernelPorts 与 workflow `call(serviceId)` 不引入第二套依赖系统：KernelPorts 必须具备稳定 `ServiceId`，并像普通 service 一样进入 `servicePorts`/TrialRun 对齐；平台/Devtools 的解释链只认 `ServiceId`。

## Technical Context

**Language/Version**: TypeScript（ESM；以仓库 `package.json` 为准）  
**Primary Dependencies**: pnpm workspace、`effect` v3、`@logixjs/core`、（Devtools）`@logixjs/devtools-react`  
**Storage**: N/A（IR/报告以 JSON 结构导出；必要时落盘到 `specs/078-module-service-manifest/*`）  
**Testing**: Vitest（Effect-heavy 优先 `@effect/vitest`）  
**Target Platform**: Node.js 20+ + modern browsers  
**Project Type**: pnpm workspace（`packages/*` + `examples/*`）  
**Performance Goals**: 默认档无常驻反射/索引成本；显式导出 Manifest/对齐检查时在预算内完成（见 `contracts/` 的 budgets）  
**Constraints**: IR 必须 Slim 且可序列化；稳定锚点去随机化；避免引入并行真相源；forward-only evolution  
**Scale/Scope**: 以“模块输入依赖端口”的可枚举关系为核心；试运行与 Devtools 仅做最小闭环

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### Answers (Pre-Design)

- **Intent → Flow/Logix → Code → Runtime**：本特性落在 Platform/Devtools 的“反射与 IR 层”：把模块依赖端口从“类型上存在、运行时不可枚举”推进为“可导出 Static IR + 可对齐 Dynamic Evidence”。
- **Docs-first & SSoT**：Manifest IR 属于平台可消费资产；需要在 `docs/ssot/platform` 补充/更新“模块 Manifest IR（含 servicePorts）”的裁决（避免仅代码里暗自演化）。
- **Effect/Logix contracts**：变更 `ModuleManifest`（reflection contract）与试运行报告（TrialRunReport 的 environment/alignment 部分）；需要同步更新 runtime SSoT 参考文档（反射/试运行）与本 spec 的 `contracts/*`。
- **IR & anchors**：新增 `servicePorts` 进入统一最小 IR 的 Static IR 子集；`ServiceId` 与 `moduleId`/端口名都必须稳定、可序列化、可 diff。
- **Deterministic identity**：不引入随机/时间 id；`ServiceId` 的生成规则必须固定并文档化（见 `contracts/service-id.md`）。
- **Transaction boundary**：对齐检查在试运行/装配阶段执行；不得引入事务窗口 IO/await。
- **Internal contracts & trial runs**：对齐检查走 TrialRunReport（可序列化）；不引入 process-global 单例作为“唯一真相源”（dev-only registry 仅用于 Devtools 辅助解释，不能替代导出的 Manifest/Report）。
- **Dual kernels (core + core-ng)**：不触及 kernel/hot paths；与 core-ng 无直接耦合。
- **Performance budget**：不改调度/txn 热路径；默认档不付反射税；显式导出/对齐检查按 budgets 控制（Manifest `maxBytes`、试运行 `maxEvents`）。
- **Diagnosability & explainability**：新增的诊断以结构化 report/manifest 字段承载；事件必须 Slim 且可序列化（避免把 Tag 实例写进证据）。
- **Breaking changes (forward-only)**：Manifest schema 增量是 breaking for consumers（新字段+版本 bump）；通过 manifestVersion + migration note 交代，无兼容层。
- **Public submodules**：核心实现下沉 `src/internal/**`；公共出口通过 `packages/logix-core/src/Reflection.ts`/`Debug.ts` 暴露必要 API，不暴露 internal。
- **Large modules/files**：`manifest.ts`、`diff.ts` 已存在且可控；若新增逻辑导致文件逼近阈值，必须按 constitution 做互斥子模块拆解。
- **Quality gates**：实现阶段至少通过 `pnpm typecheck`、`pnpm lint`、`pnpm test:turbo`；并补充针对 `extractManifest/diff/trialRun` 的单测覆盖。

### Gate Result (Pre-Design)

- PASS（本阶段交付 plan/research/data-model/contracts/quickstart；实现由 `tasks.md` 驱动）

### Gate Result (Post-Design)

- PASS（已生成 `research.md` / `data-model.md` / `contracts/*` / `quickstart.md`；未引入核心路径热改动的强制采证据要求；对外契约通过 manifestVersion + contracts 固化）

## Perf Evidence Plan（MUST）

> 若本特性触及 Logix Runtime 核心路径 / 渲染关键路径 / 对外性能边界：此节必须填写；否则标注 `N/A`。
> 详细口径见：`.codex/skills/logix-perf-evidence/references/perf-evidence.md`

- N/A（计划不改 runtime 调度/txn 热路径；变更集中在反射/试运行/Devtools 的显式调用路径）

## Project Structure

### Documentation (this feature)

```text
specs/078-module-service-manifest/
├── spec.md
├── checklists/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
├── notes/               # Optional: handoff notes / entry points ($speckit notes)
└── tasks.md             # Phase 2 output ($speckit tasks - NOT created by $speckit plan)
```

### Source Code (repository root)

```text
packages/logix-core/
├── src/Module.ts
├── src/Reflection.ts
├── src/Debug.ts
├── src/internal/reflection/manifest.ts
├── src/internal/reflection/diff.ts
├── src/internal/observability/trialRunModule.ts
└── test/**  # 为 manifest+diff+trialRun 补回归防线

packages/logix-devtools-react/
└── src/**   # 展示 servicePorts（按 moduleId / serviceId 索引）

docs/ssot/platform/
└── **（需新增/更新）** Manifest IR（含 servicePorts）的平台侧裁决与 schema
```

**Structure Decision**: 以 `@logixjs/core` 的 Reflection/TrialRun/Debug 为核心落点，Devtools 作为消费端；平台 SSoT 需要补齐 Manifest IR 的 schema 事实源，避免只在代码内演化。

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation                  | Why Needed         | Simpler Alternative Rejected Because |
| -------------------------- | ------------------ | ------------------------------------ |
| N/A                        | N/A                | N/A                                  |

## Design（关键机制）

### 1) Manifest IR：servicePorts（端口名 → ServiceId）

新增 `ModuleManifest.servicePorts`：

- `port`: string（端口名，稳定可序列化；用于定位与解释）
- `serviceId`: string（稳定 ServiceId；用于跨模块聚合与对齐）
- `optional?`: boolean（可选依赖标记；缺失不应 hard-fail；默认省略表示 required）

抽取来源：

- 优先从 `ModuleDef.services`（已存在的反射字段）读取：
  - `Record<port, Context.Tag>`（默认 required）
  - `Record<port, { tag: Context.Tag; optional?: true }>`（显式 optional）
- 端口名与 ServiceId 必须做规范化与排序（保证 diff 稳定）。

版本与 digest：

- bump `manifestVersion`，并将 `servicePorts` 纳入 digestBase（保证变更可门禁化）。
- budgets：Manifest `maxBytes` 下 servicePorts 不应被裁剪为不可用；必要时优先裁剪低价值字段（meta/source/staticIr/logicUnits/...），最后才裁剪 actions。

### 2) ServiceId 规范化（唯一实现，避免漂移）

定义一个唯一 helper（内部实现，供反射/诊断复用）：

- 优先取 `tag.key`（Effect v3 Tag 常见稳定 id）
- 其次取 `tag.id`
- 再次取 `tag._id`
- 不接受 `tag.toString()` 作为 IR 的 `ServiceId` 来源（仅允许用于 dev 诊断展示；见 Q001 与 `contracts/service-id.md`）

并把该规范写进 `contracts/service-id.md`（作为平台侧解析/展示的一致口径）。

### 3) Trial Run：声明 ↔ 环境对齐（缺失/冲突报告）

在 `trialRunModule` 报告中新增对齐结果（可 JSON 序列化）：

- `declared`: 来自 manifest 的 `servicePorts`
- `missingRequired`: 对每个 required 端口执行一次“可 resolve”检查，输出 `{ moduleId, port, serviceId }[]`
- `missingOptional?`: 对 optional 端口同样检查并输出（不作为 hard-fail 依据，但保留用于解释）
- `conflicts`（如可用）：当 app 组合提供了候选来源信息（例如显式 module→provided serviceTags），输出 `{ serviceId, candidates: { ownerModuleId, source }[] }[]`

缺失检查策略：

- 在试运行装配完成后，对每个 declared port 执行一次 `Root.resolve(tag)`（或等价从 root context 读取），确保不依赖“业务代码恰好访问到该服务”。

### 4) Devtools：moduleId→servicePorts 的解释入口

提供只读查询 API（dev-only 可选注册）：

- `Debug.getModuleManifestById(moduleId)` 或更小粒度 `Debug.getModuleServicePortsById(moduleId)`
- 数据来源：在 `Module.make` 时注册（dev-only；容量受限，避免无界增长）

Devtools UI：

- 在模块详情中展示 `servicePorts`（端口名 → ServiceId）
- 提供按 ServiceId 聚合的 consumer 视图（便于定位“谁依赖它”）

## Deliverables by Phase

- **Phase 0（research）**：`research.md`（现状、候选落点、关键决策与替代方案）。
- **Phase 1（design）**：`data-model.md`、`contracts/*`、`quickstart.md`（IR schema、对齐报告结构、使用方式）。
- **Phase 2（tasks）**：由 `tasks.md` 承载（`$speckit tasks 078` 生成/维护）。
