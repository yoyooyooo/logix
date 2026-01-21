---
title: contracts/03 · 控制面 Root IR（Control Surface Manifest）
status: living
---

# 控制面 Root IR（Control Surface Manifest）

## 结论（TL;DR）

本文件裁决：平台/Devtools/Alignment Lab 消费的 **控制面 Root Static IR** 必须收口为单一可交换工件 `ControlSurfaceManifest`，用于承载并对齐：

- `Action Surface`（actions/actionTag，权威输入事件入口）
- `Service Surface`（service ports/serviceId，权威 IO 边界入口）
- `C_T`（StateTraits/ReadQuery/DeclarativeLink 等可识别约束闭包的静态形态）
- `Π`（结构化工作流/控制律；即 workflow effect 的静态形态）
- `Opaque Effects`（允许存在的黑盒 watcher/effect，但必须显式登记为 opaque）

Root IR 的职责是“可判定/可对比/可解释/可回放锚点化”，不是运行时执行计划；执行性能来自 internal `RuntimePlan`，不得把运行时热路径成本转嫁到 Root IR。

## 0.1 双 SSoT：Authoring SSoT / Platform SSoT（统一字面标题）

为避免“同一概念两套权威口径”，本仓统一使用以下两类 SSoT：

- **Authoring SSoT（可编辑）**：面向人/LLM/Studio 的权威输入工件（可落盘/可生成/可 Schema 校验/版本化；必须纯 JSON）。例如：`WorkflowDef`、以及其它可出码/可审查的 authoring 资产。
- **Platform SSoT（只读消费）**：面向平台/Devtools/CI gate/diff 的只读消费工件（Root Static IR + slices/index）。`ControlSurfaceManifest` 即 Platform SSoT 的 Root 工件；其 `actionSurface/serviceSurface/traitSurface/workflowSurface/...` 为按需加载的 slices。

硬约束：

- Platform SSoT 必须从 Authoring SSoT **确定性编译**得到；禁止手改、禁止成为第二语义源。
- 平台事件流只携带锚点与 digest 引用；禁止把 Root IR/Π slice 全量塞进事件流。

## 0) 上游裁决（先对齐口径）

- 执行模型（$C_T/\Pi/\Delta\oplus$、tick 参考系）：`docs/ssot/platform/contracts/00-execution-model.md`
- RunResult / Trace / Tape（平台 Grounding）：`docs/ssot/platform/contracts/01-runresult-trace-tape.md`
- Platform-Grade vs Runtime-Grade（可解析子集与锚点系统）：`docs/ssot/platform/ir/00-codegen-and-parser.md`
- Action Surface（actionTag 权威来源）：`specs/067-action-surface-manifest/spec.md`
- ServiceId（稳定标识算法）：`specs/078-module-service-manifest/contracts/service-id.md`
- KernelPorts（内核端口作为 service ports）：`specs/078-module-service-manifest/contracts/kernel-ports.md`
- Tick/HostScheduler/trace:tick（参考系与诊断门控）：`specs/073-logix-external-store-tick/contracts/*`
- Workflow（结构化控制律 Π）最小 IR：`specs/075-workflow-codegen-ir/contracts/ir.md`、`specs/075-workflow-codegen-ir/contracts/diagnostics.md`
  - 命名对齐：对外 authoring 概念当前使用 `Workflow`（`@logixjs/core` 公共子模块）；其导出工件 `WorkflowStaticIr` 即这里的 Workflow Static IR（Π slice），并由 `workflowSurface` 收口引用。

## 1) 定义：什么是 Control Surface Manifest

### 1.1 控制面（Control Surface）

控制面是“系统如何响应输入并产生行为”的 **可治理表面**。在 The One 方程里，它对应：

- 约束闭包：$C_T$（traits / readQuery / declarative links / source writeback）
- 控制律：$\Pi$（结构化工作流、时间算子、并发策略、取消语义）

控制面不等于“所有手写 TypeScript”。任何无法被可靠 IR 化/序列化的逻辑，都必须降级为 `opaque` 并被显式登记。

### 1.2 Root Static IR（单一可交换工件）

`ControlSurfaceManifest` 是平台可交换的 Root Static IR：**单一事实源**，用于对齐代码、IR、运行期证据（Trace/Tape）与 Devtools 展示。

它必须满足：

- JSON 可序列化、版本化、可 diff、可被缓存；
- 稳定锚点去随机化（不得以时间/随机作为主锚）；
- 显式区分 governed vs opaque（禁止“静默黑盒”）；
- 运行时热路径不得依赖 Root IR 的扫描/哈希/序列化。

## 2) 不变量（MUST）

### 2.1 序列化与版本

- `ControlSurfaceManifest` MUST JSON 可序列化（禁止闭包/Effect/Fiber/Tag 本体进入工件）。
- MUST 带 `version`（遇到未知版本必须 fail-fast；forward-only 无兼容层）。
- MUST 带 `digest`（基于 Stable JSON：字段排序、默认值落地、去掉非语义 meta；同一语义同一 digest）。

#### 2.1.1 可导出 `meta`（MUST）

- Root IR / slices / Static IR 中的任何 `meta` 字段 MUST 为 `JsonValue`（纯 JSON 值），仅用于展示/解释，不参与语义与 `digest`。
- `meta` 禁止携带闭包/函数/Effect/Fiber/Tag/DOM/循环引用/BigInt；若输入侧仍出现，必须在导出边界确定性裁剪，并以可解释的降级标记/诊断事件被观察到（对齐 `specs/016-serializable-diagnostics-and-identity`）。
- `JsonValue` 的硬门与裁剪预算（权威实现）：`packages/logix-core/src/internal/observability/jsonValue.ts`
- Trait 系统的 `TraitMeta` 白名单与 sanitize（权威实现）：`packages/logix-core/src/internal/state-trait/meta.ts`

### 2.2 稳定身份（Deterministic Identity）

- `actionTag` MUST 等于 `actions` key（rename 即 breaking）：见 `specs/067-action-surface-manifest/spec.md`。
- `serviceId` MUST 由 `Context.Tag` 稳定派生（`tag.key ?? tag.id ?? tag._id`），`toString()` 禁止作为标识来源：见 `specs/078-module-service-manifest/contracts/service-id.md`。
- workflow 的 `programId/nodeId/stepKey` MUST 去随机化：缺失 `stepKey` 视为契约违规并 fail-fast（详见 075）。
- Root IR 不包含 `instanceId/tickSeq/txnSeq` 这类运行期锚点；它们属于动态证据，但动态证据必须能通过 `moduleId/actionTag/serviceId/programId/nodeId` 等静态锚点回链到 Root IR。

### 2.3 诊断门控与“事件流不携带 IR 全量”

- 动态事件（Trace/EffectOp/warn:*）MUST Slim 且可序列化。
- 运行期事件流 MUST NOT 携带 Root IR 全量（包括 nodes/edges/traits 表）；只能携带锚点与 digest 引用（详见 073/075）。

### 2.4 热路径约束（Perf）

- Root IR 的构建/校验/哈希 MUST 发生在冷路径（install/export/build），不得落到 tick/dispatch 的热路径。
- `diagnostics=off` 必须接近零成本：不得在每 tick 做 O(n) 扫描 Root IR（必须通过索引/路由表在 mount 期构建）。

## 3) 合同（Contract）：Root IR 的最小形态（V1）

> 本节给出“概念形态”。字段可演进，但必须遵守 2) 的不变量。具体 slices 的 schema 以各自 SSoT/Spec 为准（067/073/075/078），Root IR 负责收口与引用关系。

```ts
type ControlSurfaceVersion = 1
type Digest = string
type ModuleId = string
type ActionTag = string
type ServiceId = string

type ActionRef = { readonly moduleId: ModuleId; readonly actionTag: ActionTag }

type EffectTrigger =
  | { readonly kind: 'action'; readonly action: ActionRef }
  | { readonly kind: 'lifecycle'; readonly phase: 'onStart' | 'onInit' }

type SliceRef = { readonly digest: Digest }

type WorkflowProgramId = string

type WorkflowSurfaceRefV1 = SliceRef // MUST reference 075 workflow static IR bundle (versioned)
type ActionSurfaceRefV1 = SliceRef // MUST reference 067/069 action surface (versioned)
type ServiceSurfaceRefV1 = SliceRef // MUST reference 078 service surface (versioned)
type TraitSurfaceRefV1 = SliceRef // MUST reference 073/076 trait/static deps surfaces (versioned)

type ControlEffectIndexEntryV1 =
  | {
      readonly kind: 'workflow'
      readonly effectId: string // stable (moduleId + localId)
      readonly trigger: EffectTrigger
      /** Stable program id for cross-artifact linking; full nodes/edges live in Workflow surface. */
      readonly programId: WorkflowProgramId
      /** Optional per-program digest for fast diff; MUST be derivable from workflow surface. */
      readonly programDigest?: Digest
    }
  | {
      readonly kind: 'opaque'
      readonly effectId: string // stable (moduleId + sourceKey)
      readonly trigger: EffectTrigger
      readonly sourceKey: string // stable, serializable, de-dup friendly
      readonly summary?: string
    }

type ControlSurfaceManifestV1 = {
  readonly version: ControlSurfaceVersion
  readonly digest: Digest
  readonly modules: ReadonlyArray<{
    readonly moduleId: ModuleId
    /** Action Surface (067/069): deterministic, versioned, JSON-serializable. */
    readonly actionSurface?: ActionSurfaceRefV1
    /** Service Surface (078): deterministic serviceId list / ports. */
    readonly serviceSurface?: ServiceSurfaceRefV1
    /** C_T surfaces (073/076): traits/readQuery/declarative links, etc. */
    readonly traitSurface?: TraitSurfaceRefV1
    /** Π surface (075): workflow programs static IR (nodes/edges/policy/input expr). */
    readonly workflowSurface?: WorkflowSurfaceRefV1
    /** Minimal, budgeted index only; full payload lives in slices. */
    readonly effectsIndex: ReadonlyArray<ControlEffectIndexEntryV1>
    readonly effectsIndexDigest?: Digest
  }>
  readonly meta?: { readonly generator?: unknown } // JSON only; budgeted
}
```

裁决点：

- Root IR 是“一个工件”，但允许以多个 **slice attachment** 形式导出（例如 `actionSurface/serviceSurface/traitSurface/workflowSurface` 等）；任何 slice 都必须可从 Root IR 规范化后确定性导出（禁止并行真相源）。
- `effects[]` 统一收口 workflow 与 opaque：让“宽松默认 + 逐步收敛”可被 Devtools 观察与治理（而不是把黑盒藏起来）。

## 3.1 裁决清单（V1，已拍板）

> 这是“当前裁决”，用于指导后续实现与文档/协议统一；不作为实现备忘录。

1) **工件范围（module-first，bundle-friendly）**
   - `ControlSurfaceManifest` 的规范形态是 `modules[]`（按 `moduleId` 稳定排序）。
   - 工具链 SHOULD 以“每模块一个工件（modules.length=1）”落盘（便于缓存/diff）；RunResult/TrialRun MAY 输出“多模块 bundle”（只是在同一 schema 下稳定拼接）。

2) **Root 最小化：只存 digest + 索引，不内嵌大表**
   - Root IR MUST 以 `SliceRef{digest}` 引用 actions/services/traits/workflows 的完整表；Root 自身只携带预算内的 `effectsIndex`（用于快速展示与回链）。
   - “内嵌完整 slices”只允许作为显式选项（例如 `includeInlineSlices`），并必须受 budgets 约束且 deterministic 裁剪。

3) **版本策略（Root + slices 分区 version）**
   - Root `version` 与各 slice `version` MUST 独立演进（Root 只做收口与引用）。
   - 所有 consumer MUST 按 `version` 分发解析；遇到未知 `version` 必须 fail-fast（forward-only，无兼容层）。

4) **digest 与 Stable JSON 算法（权威）**
   - 所有 `digest` MUST 使用 `stableStringify`（字段名按字典序排序）+ `fnv1a32` 计算（实现权威：`packages/logix-core/src/internal/digest.ts`）。
   - digest 字符串 SHOULD 带前缀标注 schema+version（例如 `control_surface_v1:<hash>`），避免跨工件/跨版本碰撞。
   - 若需附带 `bytes/preview/stableJson` 等元信息，MUST 用 UTF‑8 byte 口径；可复用 `packages/logix-core/src/internal/observability/artifacts/digest.ts` 的模式。

5) **Workflow IR（Π）的最小完备形态**
   - workflow static IR MUST 包含 `InputExpr/dispatch payload`（纯数据、可序列化、无闭包），否则无法承载“出码可审查/diff”目标。
   - 大常量 MUST 有预算与确定性裁剪策略：推荐复用 `packages/logix-core/src/internal/observability/jsonValue.ts` 的 JSON hard gate（oversized → `{ _tag, bytes, preview }` 形态）。

6) **Identity：重构友好（nodeId≈stepKey；语义变更靠 digest）**
   - workflow 的 `stepKey` MUST 明示且稳定；`nodeId` MUST 主要由 `programId + stepKey (+kind)` 派生，重排不改变 id。
   - 语义变化通过 `digest` 体现；`nodeId` 不承担“语义敏感地址”的职责（避免重构导致锚点漂移）。
   - 运行期 `runId/timerId/callId` MUST 去随机化：禁止 `Math.random/Date.now` 作为主锚点；推荐用单调序号并在 Tape 中记录。

7) **ServiceCall 引用（Tag + by-id）**
   - workflow IR 内部一律只存 `serviceId: string`（单一真相源）。
   - authoring 层 MUST 同时支持 `call(Tag)` 与 `callById(serviceId)`；两者在 install/export 期都必须 fail-fast 校验可解析性，并复用 078 的 `ServiceId` 单点 helper（`specs/078-module-service-manifest/contracts/service-id.md`）。

8) **Opaque effects 与动态回链（宽松默认 + 可治理）**
   - 允许手写 watcher/effect，但凡进入 Root IR 的黑盒 MUST 显式登记为 `kind:'opaque'`，并具备稳定 `sourceKey` 用于去重与诊断。
   - `sourceKey` 默认派生策略以现有实现为准：`<logicUnitId>::<handlerId>`（权威落点：`packages/logix-core/src/internal/runtime/core/ModuleRuntime.effects.ts`、`packages/logix-core/src/internal/reflection/manifest.ts`）。
   - 动态事件回链的最小锚点承诺：任何与控制面相关的事件（EffectOp/trace/warn）MUST 能通过 `moduleId/instanceId/tickSeq` +（`actionTag` 或 `serviceId` 或 `programId`/`effectId`）回链到 Root IR；RunResult SHOULD 提供 `static.controlSurfaceDigest` 作为全局入口（见 `docs/ssot/platform/contracts/01-runresult-trace-tape.md`）。

## 4) 生成流程（从代码/出码到 Root IR）

### 4.1 生产时机（Cold Path）

- Root IR MUST 在定义期/冷路径生成：
  - `Module.make` / `ModuleDef.logic` 装配期；
  - `Reflection.extractManifest` / trial-run 的 controlled extraction 期；
  - codegen 输出落盘期（平台/AI 产物）。

### 4.2 标准流水线（Normalize → Validate → Compile → Export）

1) `normalize`：把不同来源（TS 代码、Recipe、平台编排）归一到可序列化结构；
2) `validate`（fail-fast）：版本、稳定标识、stepKey、serviceId 可解析性、可识别依赖（readsDigest）等；
3) `compileRuntimePlan`（internal）：构建索引/路由表/预解析（不得进入 Root IR）；
4) `export`：输出 Root IR（Stable JSON）并计算 digest；必要时同时输出 slice digests。

### 4.3 Platform-Grade vs Runtime-Grade（降级规则）

- 可被 Parser/编译器稳定识别的链路进入 governed（workflow/trait/readQuery/static deps）。
- 无法识别的手写 watcher/effect 允许存在，但 MUST 显式登记为 `opaque`（并提供 stable `sourceKey` 以便去重与诊断）。

## 5) 与 RunResult/Trace/Tape 的对齐

- RunResult 的 `static.*Digest` 字段 MUST 指向 Root IR 的 digest 或其确定性 slice digest（见 `docs/ssot/platform/contracts/01-runresult-trace-tape.md`）。
- Trace 事件只携带锚点与 digest 引用；Root IR 的内容按需由 Devtools/Alignment Lab 拉取或通过附件加载。
- Tape（record/replay/fork）在受控环境中记录 `timer/io/externalStore` 的客观结果，并以 `tickSeq` 为主时间轴；它的锚点必须能回链到 Root IR（`serviceId/programId/nodeId` 等）。

## 6) 代码锚点（Code Anchors）

- `packages/logix-core/src/Reflection.ts`：manifest/反射提取入口（Actions/Effects 等）
- `packages/logix-core/src/Module.ts`：ModuleDef 装配与逻辑入口
- `packages/logix-core/src/internal/reflection/manifest.ts`：ModuleManifest（actions/effects/sourceKey/digest/预算裁剪）
- `packages/logix-core/src/internal/digest.ts`：Stable JSON 与 digest（`stableStringify`/`fnv1a32`）
- `packages/logix-core/src/internal/runtime/core/DevtoolsHub.ts`：Devtools 侧证据/快照/锚点汇聚
- `packages/logix-core/src/internal/runtime/core/TickScheduler.ts`：tick 参考系与稳定化
- `packages/logix-core/src/internal/runtime/core/HostScheduler.ts`：宿主调度统一入口（microtask/macrotask/timeout）
- `packages/logix-core/src/internal/runtime/core/FlowRuntime.ts`：现有 watcher/并发语义（对齐 workflow 解释器）
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.effects.ts`：effects 注册/去重、run-phase 动态注册诊断、`sourceKey` 派生
- `packages/logix-core/src/internal/runtime/core/DeclarativeLinkIR.ts`：跨模块可识别依赖 IR（073）
- `packages/logix-core/src/internal/observability/jsonValue.ts`：可序列化 hard gate + oversized 裁剪口径
- `packages/logix-core/src/internal/observability/artifacts/digest.ts`：JsonValue digest（stableJson/bytes/digest）模式

## 7) 验证方式（Evidence）

- 结构校验：Root IR 的 `validate/export` 必须可在不运行业务 IO 的前提下完成（fail-fast）。
- 诊断门控：`diagnostics=off` 下不得引入 Root IR 扫描/序列化成本；开启 `light/sampled/full` 后只允许 Slim meta。
- 可比对性：同一输入在同一版本下导出的 Root IR 必须字节级一致（deterministic）。
