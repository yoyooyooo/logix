# Implementation Plan: 统一观测协议与聚合引擎（组件优先；扩展 P1=离线导入；P2=实时连接）

**Branch**: `005-unify-observability-protocol` | **Date**: 2025-12-31 | **Spec**: `specs/005-unify-observability-protocol/spec.md`  
**Input**: `specs/005-unify-observability-protocol/spec.md`

## Summary

目标是把“宿主无关的观测协议 + 聚合引擎”下沉到 `@logixjs/core`，让不同宿主（组件/扩展/Worker/Sandbox）消费同一份输入时，得到一致的核心结论（顺序、计数、诊断），且默认不制造观察者效应。

交付分两档：

- **P1**：组件形态跑通（含导出 EvidencePackage）；Chrome 扩展面板至少支持 **离线导入 EvidencePackage** 并展示一致视图。
- **P2**：Chrome 扩展面板支持 **实时连接页面会话**（Transport Profile + 背压 + 命令回路）。

**Scheduling Note**:

- 先完成 `specs/016-serializable-diagnostics-and-identity` 的 core hardening（单锚点 + 可序列化诊断 + setup-only）再推进 Devtools 交付面。
- 当前优先级：以 US1/US4 为 P1 主线；US3（扩展实时连接）明确为 P2。

达标路径采用 Worker-first：聚合/索引/裁剪/布局在 Worker 执行，主线程只做轻量归一化、批量投递与渲染交互；Timeline 的顶层 Span 以 `StateTransaction/txnId` 为窗口，deep 模式按需展开 trace/trait steps（对标 Chrome DevTools 的交互标准，但不强行套其语义）。

## Deepening Notes

- Decision: 扩展形态 P1 只做离线导入 EvidencePackage；实时连接与命令回路为 P2（source: spec Clarifications Session 2025-12-31 AUTO）。
- Decision: 跨宿主实时传输统一采用 `TransportMessage` v1（HELLO/SUBSCRIBE/OBSERVATION_BATCH/CONTROL/CONTROL_ACK）（source: spec Clarifications Session 2025-12-31 AUTO + `contracts/schemas/transport-message.schema.json`）。
- Decision: `protocolVersion` v1 固定为 `"v1"`，以 bump 版本表达 breaking change（source: spec Clarifications Session 2025-12-31 AUTO + `packages/logix-core/src/internal/observability/evidence.ts`）。
- Decision: 命令面必须用 `ControlCommand` + `ControlAck`（每条命令必回执，不支持必须拒绝并给 reason）（source: spec Clarifications Session 2025-12-31 AUTO + FR-007）。
- Decision: 跨宿主/证据包的 `payload` 必须满足 `JsonValue` 硬门；降级/丢弃必须可见（downgrade.reason + 会话级预算统计 + batch droppedCount）（source: spec Clarifications Session 2025-12-31 AUTO + FR-006）。
- Decision: 断线重连以 `runId + afterSeq` 为锚点尽力补发；不足必须提示并引导改用 EvidencePackage 导入（source: spec Clarifications Session 2025-12-31 AUTO）。
- Decision: `RuntimeDebugEventRef` 纳入可选 `linkId` 作为因果链锚点（source: spec Clarifications Session 2025-12-31 AUTO + `packages/logix-core/src/internal/runtime/core/DebugSink.ts`）。
- Decision: 查看器不得补造稳定键；移除 `packages/logix-devtools-react/src/internal/snapshot/index.ts` 的 `normalizeDevtoolsSnapshot`“补造”逻辑，并把缺失字段视为生产端 bug/降级提示（source: FR-002 + `docs/ssot/runtime/logix-core/observability/09-debugging.02-eventref.md`）。

## Technical Context

**Language/Version**: TypeScript（pnpm workspace / monorepo）  
**Primary Dependencies**: `effect` v3、`@logixjs/core` / `@logixjs/react` / `@logixjs/devtools-react`、React、Vite（示例/工具链）、Chrome Extension (Manifest V3)  
**Storage**: N/A（证据包导出/导入以文件或剪贴板为主；运行中以内存 ring buffer / 聚合快照为主）  
**Testing**: Vitest（含 `@effect/vitest` 约定）、TypeScript typecheck、ESLint  
**Target Platform**: 浏览器（Chrome 及兼容环境），包含页面主线程与 Web Worker；扩展需要 MV3  
**Project Type**: Monorepo packages + examples  
**Performance Goals**: 参照 `spec.md` 的 SC-001/SC-003：被测页面关键交互延迟增幅 ≤10%，面板常用操作 200ms 内可见结果；10k 事件证据包导入后 5s 内可筛选/查看；并满足 FR-012：≥10k events/s 下主线程阻塞 ≤10ms  
**Constraints**: Devtools UI 状态与副作用以 Logix Runtime 管理（避免巨型 React store）；高频事件需背压/降级且对用户可见；聚合/索引/裁剪/布局默认在 Worker 执行；禁止 watch 模式测试  
**Scale/Scope**:
- P1：US1/US4（组件形态 + 证据包导出/导入 + 录制窗口语义 + Worker-first 聚合/渲染）；扩展形态仅做离线 EvidencePackage 导入与一致视图。
- P2：US3（扩展实时连接：TransportMessage v1 + 背压 + CONTROL/ACK 命令回路）。
- `Record/Stop`：优先映射为 `resume/pause`；宿主不支持命令时退化为 local-only recording（需提示）。

## Constitution Check

_GATE: Phase 0 研究前必须通过；Phase 1 设计后再次复查。_

- **链路映射（Intent → Flow/Logix → Code → Runtime）**
  - 本特性属于 Runtime 可观测性契约：将 Logix/Effect 运行行为抽象为可传输的观测事件流，并由聚合引擎生成可视化所需快照；Devtools/插件/Playground 都是该契约的消费者。
- **依赖/修改的 SSoT 文档（docs-first）**
  - Runtime 侧单一事实源：`docs/ssot/runtime/logix-core/observability/09-debugging.*.md`（RuntimeDebugEventRef/JsonValue/Recording Window/预算统计/“viewer 不得补造”）。
  - 传输层（P2）补充口径：建议在上述 debugging 文档中补充“Transport Profile v1（HELLO/SUBSCRIBE/BATCH/CONTROL/ACK）”的裁决链接，避免只存在于 feature spec。
- **契约变更范围**
  - 会新增/调整 “观测事件 envelope（runId/seq/version）” 与 “宿主无关聚合快照” 的公共契约；核心落点应在 `@logixjs/core`（引擎优先），并在 runtime SSoT 文档中固化。
- **稳定标识（Deterministic Identity）**
  - 生产端必须生成稳定 `seq/eventSeq/txnSeq`；查看器不得补造（对应 FR-002）。
  - `txnId/eventId` 仅允许确定性派生（例如 `${instanceId}::t${txnSeq}` / `${instanceId}::e${eventSeq}`），禁止随机/时间戳作为默认 id 源。
- **事务边界（禁止事务内 IO）**
  - 观测采集必须在事务窗口外完成 IO；事务内只允许生成 Slim、可序列化的证据片段并写入 ring buffer（与 `JsonValue` 投影协同）。
- **Breaking changes（forward-only evolution）**
  - 计划移除/禁止 Devtools viewer 的“补造/归一化稳定键”逻辑（见 Deepening Notes 最后一条）。需要在 `specs/005-unify-observability-protocol/plan.md` 与相关 release note 记录迁移说明（无兼容层）。
- **质量门槛（Pass 定义）**
  - 必跑：`pnpm typecheck`、`pnpm lint`。
  - 与本特性直接相关的包：`pnpm -C packages/logix-core test`、`pnpm -C packages/logix-devtools-react test`（如存在/可行），以及必要的协议/聚合单测。
  - Pass：无新增类型错误、无新增 lint 错误、核心聚合/协议的单测通过。

## Perf Evidence Plan（MUST）

> 详细口径见：`.codex/skills/logix-perf-evidence/references/perf-evidence.md`

- Baseline 语义：代码前后（before=改动前 commit；after=当前工作区 local），并补一组策略 A/B（devtools off vs on）量化观测开销。
- envId：`<os-arch.cpu.chrome-version.headless>`（同机同浏览器版本/同 headless，锁死可比性）。
- profile：结论必须用 `default`（或 `soak`）；`quick` 仅探路。
- collect（before）：`pnpm perf collect -- --profile default --out specs/005-unify-observability-protocol/perf/before.<sha>.<envId>.default.json`
- collect（after）：`pnpm perf collect -- --profile default --out specs/005-unify-observability-protocol/perf/after.local.<envId>.default.json`
- diff：`pnpm perf diff -- --before specs/005-unify-observability-protocol/perf/before.<sha>.<envId>.default.json --after specs/005-unify-observability-protocol/perf/after.local.<envId>.default.json --out specs/005-unify-observability-protocol/perf/diff.before.<sha>__after.local.<envId>.default.json`
- Failure Policy：出现 `comparable=false` / `stabilityWarning` / `timeout` / `missing suite` → 禁止下硬结论，必须复测或缩小子集后再对比。

## Phases（初步拆解）

### Phase 0（Research）：把“能落地”变成可执行约束

- 明确 P1 的离线导入闭环：EvidencePackage 的导出/导入边界、版本不匹配降级提示、viewer 不补造稳定键。
- 明确 runId/seq/Recording Window 语义：seq 作为主排序键由运行环境生成；Record/Stop 不创建新 runId，证据包可只含录制窗口内事件且 seq 可不从 1 开始/可有间隙。
- 明确 “原始数据保留” 与 “不可序列化 payload” 的可预测降级策略（不做风险提示，但要保证导出/导入不崩溃）。
- 明确背压/降级策略在协议层的表达（例如 drop/summary/按需详情），并与 SC-001 的“低干扰”目标对齐；高负载下支持可见的节流/暂停渲染但继续记录。
- （P2）明确 Chrome 扩展实时连接边界：devtools page / background / content-script / window.postMessage 的最小链路与限制，并以 `TransportMessage` v1 固化可测的 transport contract。

### Phase 1（Design & Contracts）：core 打底 + 宿主适配

- 在 `@logixjs/core` 定义并实现：
  - 宿主无关协议（事件/命令/证据包的最低必要结构，含 version/runId/seq/timestamp、Recording Window 语义、`pause`/`resume` 命令）。
  - 宿主无关聚合引擎：输入事件流/证据包，输出用于 Devtools 视图的聚合快照（含 txn span / signal lane 等，满足 FR-011/FR-012）。
  - Worker-first Boundary：定义 append-only 事件输入与快照输出的 Worker 边界（含节流/降级），并保证 Worker 不可用时可预测降级且对用户可见。
  - 与现有 DebugSink/DevtoolsHub 的适配层（把现有 Debug.Event、trace:\* 事件等装入统一 envelope）。
- 在 `@logixjs/devtools-react` 抽离 “数据源适配”：
  - 组件形态：直接连接 page 内数据源；
  - 扩展离线形态：仅导入 EvidencePackage；
  - （P2）扩展实时形态：连接扩展通道的远程数据源；
  - UI 层与聚合层复用同一逻辑与快照结构。
- Sandbox/Playground（可选）：将 `packages/logix-sandbox` 的 `SandboxEvent` 与统一协议对齐（至少补齐 runId/seq），作为 Worker/transport 场景验证入口（非达标必需）。

### Phase 2（准备进入 $speckit tasks）：按 FR 拆成可独立交付任务

- 以 FR-002/FR-011/FR-012 为主线：先完成 core 协议与聚合（含 Worker-first 达标边界与节流/降级），再分别落地组件宿主与插件宿主，并交付 Timeline/Flamegraph 的核心交互闭环。

## Project Structure

### Documentation（本特性）

```text
specs/005-unify-observability-protocol/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── design-timeline-rendering.md
├── quickstart.md
├── contracts/
├── perf/                 # 性能证据（before/after/diff）
└── tasks.md
```

### Source Code（相关目录）

```text
packages/
├── logix-core/                 # 观测协议/聚合引擎的核心落点（本特性主战场）
├── logix-devtools-react/       # 组件形态 Devtools UI（含 Worker glue / Timeline/Flamegraph；可复用到插件）
├── logix-react/                # RuntimeProvider 等 React 适配（可能需要补充 hooks/bridge）
├── logix-sandbox/              # Host↔Worker 协议（可选对齐统一协议）
└── logix-devtools-chrome/      # [计划新增] Chrome 扩展壳（MV3），复用 devtools UI + 协议/聚合

examples/
└── logix-sandbox-mvp/          # Worker 场景验证（可选）

docs/ssot/runtime/
└── logix-core/observability/   # 观测/调试契约（SSoT）
```

**Structure Decision**: 保持 monorepo 分包；协议/聚合引擎下沉到 `packages/logix-core`，宿主形态差异仅体现为 transport 与 data-source adapter；Chrome 扩展作为独立包承载构建与 MV3 资源，但 UI 与聚合层复用现有 devtools 资产。

## Complexity Tracking

N/A（当前无需要豁免的 Constitution 违例。）
