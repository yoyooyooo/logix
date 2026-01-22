---
title: Digest/Diff/Anchors 教程 · 剧本集（从 0 到 1）
status: draft
version: 1
---

# Digest/Diff/Anchors 教程 · 剧本集（从 0 到 1）

> **定位**：这是 `docs/ssot/handbook/` 的“维护者教程/剧本集”（how-to），用于新成员上手、老成员回味与平台/工具开发对齐。  
> **重要**：本文不是裁决来源；凡涉及 MUST/协议/边界的最终口径以 SSoT 为准（`docs/ssot/platform/**` 与 `docs/ssot/runtime/**`）。

## 0. 最短阅读路径（10 分钟上手）

如果你只想快速把“digest/diff 到底解决什么”塞进脑子里：

1. 先读「1. 一个统一心智模型：Digest 是稳定引用，不是哈希玩具」。
2. 再读「2. 本仓已有的 digest 家族（含版本前缀）」与「3. 剧本索引」。
3. 最后挑两条“最常用剧本”：
   - A2 `Reflection.diffManifest`（CI/审阅/门禁）
   - A4 `Observability.trialRunModule`（依赖预检 + IR/证据提取）

## 1. 一个统一心智模型：Digest 是稳定引用，不是哈希玩具

你可以把 digest 理解为“跨层稳定引用（stable reference）”，它把某个层级的“语义边界”压缩成一个短指纹，使得平台/CI/Devtools 在不读源码、不依赖进程随机性的前提下做到：

- **增量**：不变就复用，变了才付费（出码、渲染、分析、回归对比）。
- **对齐**：动态证据（Trace/Tape/Snapshot）可以通过锚点回链到静态结构（IR）。
- **去噪**：把“会抖动的东西”隔离在 digest 之外（例如 meta/source/时间戳）。
- **可解释 diff**：digest 只负责回答“变没变”；diff 负责回答“变了什么/严重级别/如何迁移”。

### 1.1 Digest / Diff / Anchors 三件套

- **Anchors（锚点）**：稳定标识集合（静态：`moduleId/actionTag/serviceId/programId/nodeId/stepKey/...`；动态：`instanceId/tickSeq/txnSeq/opSeq/runId/...`）。锚点让“事件能定位回结构”。
- **Digest（稳定引用）**：对某个“可序列化语义边界”的确定性指纹，常用于判等/缓存 key/去重索引/漂移检测。
- **Diff（可解释差异）**：面向人/机器的差异摘要（稳定排序、分级 severity、可门禁 verdict）。

> 经验法则：当你想让平台“既能快，又能解释”，就用 digest 做 cheap gate，用 diff 做 explainable gate。

## 2. 本仓已有的 digest 家族（含版本前缀）

这仓库的 digest 都有一个共同点：**先做稳定序列化 `stableStringify`，再做轻量 hash `fnv1a32`，最后加版本前缀**。版本前缀不是装饰，而是“forward-only 演进的边界”。

实现入口：`packages/logix-core/src/internal/digest.ts`

- `stableStringify(value)`：对象 key 按字典序排序；`undefined/function/symbol` 等不可表示值降级为 `null`；数组顺序保持；非有限数（NaN/±Infinity）降级为 `null`。
- `fnv1a32(input)`：32-bit FNV-1a（输出 8 位 hex）。**不是加密哈希**，仅用于短指纹；理论上可能碰撞，但适合用作“快速判等/索引 key”。

### 2.1 `manifest:067:*`（ModuleManifest digest）

入口：`packages/logix-core/src/internal/reflection/manifest.ts`

- 输出：`ModuleManifest.digest = "manifest:067:<8hex>"`
- digest base（参与 hash 的字段）只包含“结构化契约字段”：
  - `moduleId`
  - `actionKeys/actions`（按 `actionTag` 稳定排序）
  - `effects`（含 `sourceKey`，稳定排序 + 去重）
  - `schemaKeys`
  - `logicUnits`
  - `staticIrDigest`（注意：只纳入 `staticIr.digest`，不纳入 `staticIr` 全量）
- 明确不纳入（或会被预算裁剪影响的部分）：顶层 `meta/source/staticIr(本体)`

> 注意：`actions[]/effects[]` 内部目前会携带可选的 `source {file,line,column}`，它**属于 digest base 的一部分**。因此“纯语义不变但源码位置变化”也可能导致 `manifest.digest` 变化——这在做缓存命中/降噪时需要被显式意识到（后续若要更强的“语义稳定”，应通过版本 bump 调整 digest base 口径）。

用途关键词：**结构判等 / CI 门禁 / 出码 cache key（结构级） / 降噪**

### 2.2 `stir:009:*`（Traits Static IR digest）

入口：`packages/logix-core/src/internal/state-trait/ir.ts`

- 输出：`StaticIr.digest = "stir:009:<8hex>"`
- digest base 包含：
  - `version`（当前默认 `009`）
  - `moduleId`
  - `nodes/edges`（包含 reads/writes、externalStore policy 等）
- 特别注意：此处的“稳定性”依赖于节点/边的稳定排序与字段归一（例如字段路径 canonicalize）。

用途关键词：**漂移检测 / diff 触发器 / Devtools 静态图去重**

### 2.3 `artifact:031:*`（TrialRun artifacts digest）

入口：`packages/logix-core/src/internal/observability/artifacts/digest.ts`

- 输出：`ArtifactEnvelope.digest = "artifact:031:<8hex>"`
- digest 的对象是 artifact 的稳定 JSON（`stableStringify` 输出的字符串），并同时记录 bytes；超预算会截断 value，但 digest 指向“截断前的稳定 JSON”。

用途关键词：**内容寻址 / 去重存档 / 预算裁剪下的可比性**

### 2.4 无前缀的 digest（内部摘要用）

例：Kernel contract 用的 `traceDigest = fnv1a32(stableStringify(traceOps))`  
入口：`packages/logix-core/src/internal/reflection/kernelContract.ts`

用途关键词：**快速摘要 / 诊断输出（不是协议字段）**

## 3. 剧本索引（你要做什么 → 直接跳哪一节）

### A. 现在就能跑通的“运行时/CI/工具”剧本（实现已存在）

- A1 导出 `ModuleManifest`（结构摘要 + digest）
- A2 对比 `ModuleManifest`（diff + severity + verdict）
- A3 导出 Traits `StaticIr`（静态依赖图 + digest）
- A4 `trialRunModule` 依赖预检（失败也能解释）+ 同步导出 manifest/staticIr/evidence/artifacts
- A5 TrialRun artifacts：写 exporter、预算裁剪、digest 去重
- A6 Sandbox `IrPage`：把 IR/报告“安全地跑起来并带回来”
- A7 Devtools EvidencePackage：动态事件 + 静态图按 digest 去重（full 诊断）
- A8 Kernel contract：两次 trial-run 的 effectop trace 对比（升级/切 kernel 的合同门禁）
- A9 Full cutover gate：合同对比 + 控制面证据（runtimeServicesEvidence）综合门禁

### B. 075/080 终态会用到的“平台/出码/对齐”剧本（部分仍在规划/施工）

- B1 Root IR：`ControlSurfaceManifest`（controlSurfaceDigest）+ slices（workflowSurfaceDigest/traitIrDigest）
- B2 出码增量：用 digest 做 cache key，用 diff 生成 forward-only 迁移说明
- B3 Devtools 回链：事件只带锚点+digest 引用；按 digest 加载 Root IR 并建索引
- B4 Tape record/replay/fork：用 static digests 做一致性校验与回放对齐

### C. 维护者剧本（如何演进/如何避免漂移）

- C1 何时 bump digest 版本前缀（manifest:067 / stir:009 / artifact:031）
- C2 如何避免 digest 抖动（stableStringify、排序、去随机化）
- C3 meta 噪声治理（allowlist / 分级 / 裁剪）
- C4 oversized/timeout/missingDependency 的排障套路（与 digest/diff 的关系）

---

## A1. 导出 `ModuleManifest`（结构摘要 + digest）

**你在解决什么**：把一个 `Module` 当作“可交付资产”审阅/存档/对比，而不是只会运行。

**输入**：`AnyModule | ModuleImpl`（通常是 `AppRoot`）。

**输出**：`ModuleManifest`（JSON 可序列化）+ `manifest.digest`（稳定引用）。

**怎么做**：

1. 调用 `Logix.Reflection.extractManifest(module, { includeStaticIr, budgets })`。
2. 把输出落盘（用于 PR 附件、CI 工件、平台资产库）。

**关键语义**：

- `manifest.digest` 是“结构级指纹”，用于快速判等与缓存命中；它刻意不把顶层 `meta/source/staticIr 本体`算进去，以避免噪声（但 `actions[]/effects[]` 内部目前仍可能包含 `source`，会影响 digest）。
- 如设置 `budgets.maxBytes`，超预算会按固定顺序 deterministic 裁剪字段，并在 `meta.__logix` 标记 dropped/truncated 信息（即使裁剪，digest 仍基于 base 结构字段）。

**代码锚点**：

- `packages/logix-core/src/Reflection.ts`：`extractManifest`
- `packages/logix-core/src/internal/reflection/manifest.ts`：提取逻辑、digest base、预算裁剪

---

## A2. 对比 `ModuleManifest`（diff + severity + verdict）

**你在解决什么**：把“模块结构变化”转成可机器消费/可 UI 展示的变更摘要，并给 CI 一个稳定门禁口径。

**输入**：`before: ModuleManifest`、`after: ModuleManifest`

**输出**：`ModuleManifestDiff`：

- `changes[]`：稳定排序（先 severity，再 code，再 pointer）
- `summary`：breaking/risky/info 计数
- `verdict`：`FAIL`（有 BREAKING）/`WARN`（无 BREAKING 但有 RISKY）/`PASS`

**怎么做**：

1. 在 CI 或平台侧保存上一版 manifest（例如 PR base 或已发布版本）。
2. 用 `Logix.Reflection.diffManifest(before, after, { metaAllowlist })` 得到 diff。
3. 把 `diff.verdict` 作为门禁结果；把 `changes` 作为“迁移说明素材”。

**关键语义**：

- `meta` 默认全部归类为 `RISKY`（因为 meta 往往是治理/归属/实验开关，变化需要显式可见）。
- `metaAllowlist` 可以用于“降噪”，只关注允许变化的 meta key（避免 CI 被 owner/team 等字段淹没）。

**代码锚点**：

- `packages/logix-core/src/internal/reflection/diff.ts`：`diffManifest`
- `apps/docs/content/docs/api/core/inspection.cn.md`：示例用法（Manifest 与 diff）

---

## A3. 导出 Traits `StaticIr`（静态依赖图 + digest）

**你在解决什么**：把 traits（$C_T$）的静态依赖图导出成可 diff 的“地图”，并用 digest 去重/漂移检测。

**输入**：包含 traits 的 `Module`。

**输出**：`StaticIr`（nodes/edges + digest）。

**怎么做**：

1. `Logix.Reflection.exportStaticIr(module)`（无 traits 会返回 `undefined`，语义稳定）。
2. 保存 `StaticIr.digest`；在 manifest 中它也会以 `staticIrDigest` 参与 `manifest.digest` 的判等。

**什么会导致 digest 变化**：

- 节点/边新增/删除（计划步骤变化、依赖变化）。
- read/write 集合变化（字段路径会做 canonicalize）。
- external store 相关 policy 变化（例如 lane/selectorId/readsDigest/fallbackReason）。

**代码锚点**：

- `packages/logix-core/src/internal/state-trait/ir.ts`：`exportStaticIr`（含 digest 计算）
- `packages/logix-core/src/internal/reflection/manifest.ts`：把 `staticIr.digest` 纳入 manifest digest base

---

## A4. `trialRunModule`：依赖预检 + IR/证据提取（失败也能解释）

**你在解决什么**：在“不执行业务 main”的前提下启动一次模块装配，导出：

- 缺失依赖/缺失配置（可行动）
- 控制面证据（runtimeServicesEvidence 等）
- 结构摘要与 IR（manifest/staticIr）
- artifacts（可选）
- EvidencePackage（事件序列，按预算裁剪）

**输入**：`module` + `options`（runId、diagnosticsLevel、maxEvents、timeouts、layer、budgets 等）

**输出**：`TrialRunReport`（JSON 可序列化）

**怎么做**：

1. 调用 `Logix.Observability.trialRunModule(module, options)`。
2. CI 场景必须显式提供 `runId`（避免不可对比）。
3. 根据 `report.ok` 与 `report.error.code` 做门禁或提示。

**关键语义**：

- 只覆盖 **boot + scope close**；不会跑业务 main（避免为了拿结构信息而执行真正 IO）。
- 错误必须分类：`MissingDependency / TrialRunTimeout / DisposeTimeout / Oversized / RuntimeFailure`。
- `budgets.maxBytes` 是对整个报告的体积门禁；超限会降级为 `Oversized` 并列出 dropped 字段（而不是静默截断）。

**代码锚点**：

- `packages/logix-core/src/internal/observability/trialRunModule.ts`
- `docs/ssot/runtime/logix-core/api/06-reflection-and-trial-run.md`（总体口径）

---

## A5. TrialRun artifacts：写 exporter、预算裁剪、digest 去重

**你在解决什么**：让“额外的、可序列化的诊断产物”以统一协议输出，并具备：

- stable digest（可去重、可存档、可对比）
- per-artifact 预算裁剪（默认 50KB）
- key 冲突检测（同一 artifactKey 多 exporter → 输出冲突 envelope）

**输入**：exporter 列表（`TrialRunArtifactExporter`）+ inspection context（moduleId/manifest/staticIr/environment）

**输出**：`TrialRunArtifacts`（`Record<artifactKey, ArtifactEnvelope>`）

**怎么做（写一个新的 exporter）**：

1. 选择一个稳定的 `artifactKey`（全局唯一；命名建议按领域前缀，例如 `form.rules`、`query.plan`）。
2. 实现 `export(ctx)`，只返回 `JsonValue` 或 `undefined`（禁止闭包/Tag/Effect/Fiber 等）。
3. 不要自己做 JSON.stringify/digest；交给收集器统一处理（保证预算与协议一致）。

**关键语义**：

- digest 对应“截断前的稳定 JSON”，因此即使 value 被截断，仍能用 digest 判断内容是否变化。
- exporter 输出顺序不影响最终结果：收集器会排序、去重、裁剪、再按 key 输出稳定顺序。

**代码锚点**：

- `packages/logix-core/src/internal/observability/artifacts/collect.ts`：冲突/裁剪/排序/输出
- `packages/logix-core/src/internal/observability/artifacts/digest.ts`：`artifact:031:*`

---

## A6. Sandbox `IrPage`：把 IR/报告“安全地跑起来并带回来”

**你在解决什么**：在受控 worker 环境编译并执行用户模块代码，拿到 IR/报告/证据并渲染为 UI。

**链路（高层）**：

1. 页面把用户输入的 `moduleCode` 拼成 wrapper ESM。
2. wrapper 内调用 `Logix.Observability.trialRunModule(__programModule, trialRunOptions)` 并 return `{ manifest, staticIr, trialRunReport, evidence }`。
3. sandbox worker 编译 wrapper（esbuild-wasm，固定 kernelUrl/effect 依赖），再运行并把返回值作为 `stateSnapshot` 回传 host。

**你能从这里学到什么**：

- “IR 提取能力”本质在 `@logixjs/core`，sandbox 负责 **安全运行与回传**。
- digest/diff 这套能力天然适合做成“平台工具链”，因为输入/输出都是纯数据，可缓存、可审阅。

**代码锚点**：

- `examples/logix-sandbox-mvp/src/ir/IrPage.tsx`：UI + wrapper 生成
- `examples/logix-sandbox-mvp/src/ir/IrLogic.ts`：compile/run + bundle 识别
- `docs/ssot/runtime/logix-core/api/07-ir-pipeline-from-irpage.01-from-irpage.md`

---

## A7. Devtools EvidencePackage：动态事件 + 静态图按 digest 去重（full 诊断）

**你在解决什么**：动态事件流必须 Slim，但又需要“离线解释/回放”时能携带必要静态图。

**现状实现（trait converge 场景）**：

- ring buffer 里会出现 `trait:converge` 事件，meta 带 `staticIrDigest`。
- 在 `full` 诊断下，导出 EvidencePackage 时会按 `staticIrDigest` 去重收集对应 `ConvergeStaticIrExport`，并塞进 `evidence.summary.converge.staticIrByDigest`。

**为什么重要**：

- 这就是“事件不带大图 → 事件带 digest 引用 → summary 附带按 digest 的静态图映射”的最小闭环。
- 它是未来 `ControlSurfaceManifest`/`workflowSurface` 走向 Root IR 模式的原型。

**代码锚点**：

- `packages/logix-core/src/internal/runtime/core/DevtoolsHub.ts`：`exportDevtoolsEvidencePackage`
- `packages/logix-core/src/internal/observability/evidence.ts`：EvidencePackage 形态

---

## A8. Kernel contract：两次 trial-run 的 effectop trace 对比（升级/切 kernel 的合同门禁）

**你在解决什么**：当你想替换/升级 runtime kernel（例如 core → core-ng），你需要一个“可机器门禁”的合同对比，避免 silent behavior drift。

**输入**：

- 同一个 `module`
- 两套 trial-run options：`before`/`after`（可带不同 Layer、不同 runtimeServices overrides）

**输出**：`KernelContractVerificationResult`：

- `before/after`：每次 run 的 kernelImplementationRef、runtimeServicesEvidence、trace 摘要（digest+opCount）
- `changes[]`：`op.added/op.removed/op.changed` 或 `run.failure`

**关键做法（为什么它稳定）**：

- 用 middleware 观察 `EffectOp` 并记录成 `trace:effectop` 事件（可关闭 observers）。
- 把 volatile 字段从 op meta 里剔除/规范化（instanceId/txnId/runtimeLabel/linkId 等不参与合同）。
- 把运行期 instanceId 映射成 i1/i2...（去随机化），用 `(instanceId, txnSeq, opSeq)` 做稳定锚点。
- 对比时用 `stableStringify` 做判等，保证排序/序列化稳定。

**代码锚点**：

- `packages/logix-core/src/internal/reflection/kernelContract.ts`：`verifyKernelContract`
- `packages/logix-core/src/Reflection.ts`：公共出口

---

## A9. Full cutover gate：合同对比 + 控制面证据（runtimeServicesEvidence）综合门禁

**你在解决什么**：当你准备把某个 kernel 作为默认实现（full cutover），除了“合同一致”之外，还要验证：

- 请求的 kernel 是否真的生效（requested vs effective）
- runtime services 是否按预期绑定/覆写（runtimeServicesEvidence）

**输入**：

- `verifyKernelContract` 的 before/after（合同）
- `gateAfter`（或复用 `after`）用来采集 `Kernel.getKernelImplementationRef` 与 `Kernel.getRuntimeServicesEvidence`

**输出**：`FullCutoverGateVerificationResult`：

- `gate`：`Kernel.evaluateFullCutoverGate(...)` 的结果
- `contract`：kernel contract diff
- `verdict`：gate PASS 且 contract PASS 才 PASS
- 可选 allowlist：允许某些 op meta key 变化（默认关闭；forward-only 场景下用于降噪但需显式开关）

**代码锚点**：

- `packages/logix-core/src/Reflection.ts`：`verifyFullCutoverGate`
- `packages/logix-core/src/Kernel.ts`：`KernelContractMetaAllowlist`、`evaluateFullCutoverGate`

---

## B1.（规划）Root IR：`ControlSurfaceManifest`（controlSurfaceDigest）+ slices

> 本节是“终态剧本”的教程化描述；裁决口径以平台 SSoT 为准。

**你在解决什么**：把平台/Devtools/Alignment Lab 消费的控制面静态结构收口为单一可交换工件，并让 RunResult/Trace/Tape 都能通过 digest 与锚点回链到它。

**SSoT 入口**：

- Root IR：`docs/ssot/platform/contracts/03-control-surface-manifest.md`
- RunResult 静态 digest 字段：`docs/ssot/platform/contracts/01-runresult-trace-tape.md`
- 术语表（Recipe/Canonical AST/Workflow Static IR/...）：`docs/ssot/platform/foundation/glossary/04-platform-terms.md`

**预期形态（关键点）**：

- `ControlSurfaceManifest.digest`：Root IR 的全局稳定引用（首选）。
- 允许提供 slices digests：`workflowSurfaceDigest/traitIrDigest/...`，但必须能从 Root IR **确定性导出**（禁止并行真相源）。
- 动态事件不能携带 Root IR 全量，只携带锚点与 digest 引用。

---

## B2.（规划）出码增量：用 digest 做 cache key，用 diff 生成 forward-only 迁移说明

**你在解决什么**：平台/工具链的出码不依赖 git diff，而依赖“语义边界 digest”，从而做到跨环境可复现与增量。

**典型流程**：

1. 输入收敛到 Root IR（或至少 workflow/trait slices）。
2. 以 `codegenVersion + controlSurfaceDigest`（或 slice digest）作为缓存 key：
   - 命中：复用生成物；
   - 未命中：只重生成变化的 slice。
3. 变化检测：
   - digest 不变：跳过昂贵步骤；
   - digest 变化：产出 diff（结构化 changes）→ 用作门禁与迁移说明素材。

**迁移说明（forward-only）**：

- 不提供兼容层/弃用期，但必须显式说明 breaking 与改法；
- diff 的 `pointer` + 锚点（`actionTag/serviceId/stepKey/...`）是迁移说明的“可执行定位信息”。

---

## B3.（规划）Devtools 回链：按 digest 加载 Root IR 并建索引

**你在解决什么**：事件流 Slim，但 UI 仍然能做到“点事件 → 高亮 workflow node/trait node → 展开解释链”。

**最小闭环**：

1. RunResult 提供 `static.controlSurfaceDigest`（或 slices digests）。
2. Devtools 按 digest 加载 Root IR（或从附件/缓存命中）。
3. 在冷路径建索引：
   - `byActionTag`、`byServiceId`、`byProgramId/nodeId/stepKey` 等。
4. 消费事件：
   - 事件只携带锚点（`tickSeq/txnSeq/opSeq/linkId + actionTag/serviceId/programId/nodeId`），Devtools 用索引回链到结构。

---

## B4.（规划）Tape record/replay/fork：用 static digests 做一致性校验与回放对齐

**你在解决什么**：Trace 负责解释，Tape 负责确定性回放；Tape 必须能证明“回放的是同一套控制面”。

**建议约束**：

- record 时把 `controlSurfaceDigest`（或等价静态 digest）写入 tape header。
- replay/fork 时先校验 digest：
  - 一致：允许 deterministic replay；
  - 不一致：fail-fast 或显式进入“迁移/重录”流程（forward-only）。

SSoT 入口：`docs/ssot/platform/contracts/01-runresult-trace-tape.md`、`specs/075-flow-program-codegen-ir/contracts/tape.md`

---

## C1. 何时 bump digest 版本前缀（manifest:067 / stir:009 / artifact:031）

**原则**：当“同一语义是否应当得到同一 digest”的判定发生变化，就必须 bump 版本前缀；否则就是 silent drift。

典型触发：

- `stableStringify` 规则变化（例如 `undefined` 的编码方式、key 排序规则）。
- IR 的 canonicalize 规则变化（例如字段路径归一策略、默认值落地策略）。
- digest base 字段集合变化（纳入/剔除某字段）。

**建议流程**：

1. bump 对应的版本号（例如 manifestVersion/stir version/artifact version）。
2. 更新相关 SSoT/handbook 说明（至少写清“为什么 bump”）。
3. 跑类型/测试，确保不会出现“同一输入随机变 digest”的抖动。

---

## C2. 如何避免 digest 抖动（stableStringify、排序、去随机化）

常见抖动来源：

- `Object.keys` 未排序（不同 JS 引擎/运行期顺序差异）。
- 把 `Date.now/Math.random` 等运行期值塞进 digest base。
- 把 `Error/Tag/Function` 等不可稳定序列化对象塞进 JsonValue。

本仓已有的防线（写新代码时对齐）：

- 所有参与 digest 的对象都走 `stableStringify`。
- 数组/keys 排序要显式稳定。
- 运行期锚点必须去随机化（例如 kernel contract 把 instanceId 映射为 i1/i2...）。
- JsonValue 走硬门（`isJsonValue`）与预算裁剪，不让闭包/循环引用混入。

---

## C3. meta 噪声治理（allowlist / 分级 / 裁剪）

你会遇到两类 meta：

1. **治理 meta**（owner/team/labels）：变化频繁但不一定影响行为；
2. **行为 meta**（policy/flags）：变化可能影响行为，需要显式可见。

本仓现状做法：

- Manifest diff：meta 默认 `RISKY`，可用 `metaAllowlist` 降噪。
- Kernel contract：可选 allowlist（只允许某些 op meta key 变化）。
- 预算裁剪：超限不静默丢弃，而是在 `__logix` 标记 dropped/truncated。

---

## C4. oversized/timeout/missingDependency 的排障套路（与 digest/diff 的关系）

当你在 CI/平台看到 trial-run 失败，优先按“错误类型”而不是按“堆栈”行动：

- `MissingDependency`：说明依赖在 build/assembly 阶段被访问；要么补 mock Layer，要么把依赖访问挪到 runtime。
- `TrialRunTimeout`：大概率是装配阶段阻塞（Effect.never / 未完成 acquire）；先定位哪段初始化没结束。
- `DisposeTimeout`：资源没有收束（未关闭 handle/fiber/listener）；优先查 Scope close 路径。
- `Oversized`：报告体积超预算；调小 `maxEvents` 或把大块产物迁到 artifacts（可被单独裁剪/去重）。

digest/diff 在排障里扮演的角色：

- 用 digest 把一次失败与对应静态结构绑定（避免“换了代码但还在看旧报告”）。
- 用 diff 把“本次失败是否因为结构变化”快速判定出来（结构没变更应怀疑环境/依赖/预算）。
