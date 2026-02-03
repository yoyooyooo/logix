# 3. IR 产物数据模型（形状 + 字段语义 + 来源）

> 本节是“读 JSON 就能懂”的关键：每个字段都回答三件事：它是什么、来自哪里、如何保证确定性/可解释性。

## 3.1 `ModuleManifest`（Manifest IR）

定义：`packages/logix-core/src/internal/reflection/manifest.ts`

| 字段              | 类型                         | 含义                                   | 来源/规则                                                                                                                   |
| ----------------- | ---------------------------- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `manifestVersion` | `string`                     | Manifest 协议版本                      | 当前实现固定 `"083"`                                                                                                        |
| `moduleId`        | `string`                     | 模块长期稳定 id（语义锚点）            | 优先来自 `ModuleImpl.module.id`；否则取 `module.id` / `module.tag.id`                                                       |
| `actionKeys`      | `string[]`                   | 可 dispatch 的 action 列表（排序稳定） | `tag.shape.actionMap` 的 key，`sort()`                                                                                      |
| `actions`         | `ModuleManifestAction[]`     | action 定义摘要（排序稳定）            | 从 `tag.shape.actionMap` 推导 `payload.kind`，并 best-effort 关联 primary reducer / source                                  |
| `effects?`        | `ModuleManifestEffect[]`     | effects 摘要（排序稳定）               | 当前实现仅导出 `Module.make({ effects })` 的声明 effects，并按 `(actionTag, sourceKey)` 去重排序；无则省略                  |
| `schemaKeys?`     | `string[]`                   | `module.schemas` 的 key（排序稳定）    | `Object.keys(schemas).sort()`；无则省略                                                                                     |
| `logicUnits?`     | `{kind,id,derived?,name?}[]` | 已挂载的逻辑单元摘要（排序稳定）       | 从 `Symbol.for("logix.module.internal")` 的 `mounted` 里提取                                                                |
| `slots?`          | `Record<string, { required?, unique?, kind? }>` | 命名逻辑槽位定义（排序稳定）           | 来自 `module.slots`；key 排序稳定；仅保留 `required/unique/kind("single"|"aspect")`                                         |
| `slotFills?`      | `Record<string, string[]>`   | 各槽位当前填充的逻辑单元 id（排序稳定） | 从 `Symbol.for("logix.module.internal")` 的 `mounted` 聚合 `slotName → [logicUnitId]`；slotName/ids 均排序稳定              |
| `servicePorts?`   | `{port,serviceId,optional?}[]` | 声明的输入服务依赖端口（排序稳定）     | 来自 `module.services`（端口名 → Tag）；ServiceId 通过统一 helper 规范化；按 `port/serviceId` 排序；无则省略               |
| `source?`         | `{file,line,column}`         | 可追溯来源（仅用于解释/跳转）          | 读取 `module.dev.source`（必须是 1-based 正整数）                                                                           |
| `meta?`           | `Record<string, JsonValue>`  | 业务/平台附加元信息（必须可序列化）    | 读取 `module.meta`，仅保留 `JsonValue`，key 排序                                                                            |
| `staticIr?`       | `StaticIr`                   | 可选：内嵌 Static IR                   | 仅当 `includeStaticIr=true` 时填充（见 3.2）                                                                                |
| `digest`          | `string`                     | **稳定摘要**（用于 diff/降噪）         | `manifest:083:${fnv1a32(stableStringify(digestBase))}`，且 **不包含** `meta/source/staticIr` 本体，只包含 `staticIr.digest` |

**预算裁剪（`options.budgets.maxBytes`）**：

- 若 Manifest JSON 的 UTF-8 byte 长度超限，会按固定顺序裁剪：`meta → source → staticIr → logicUnits → slotFills → slots → schemaKeys → effects → actions(+actionKeys，二分截断)`。
- 裁剪信息会写入 `meta.__logix = { truncated, maxBytes, originalBytes, dropped, truncatedArrays }`（用于解释“为什么缺字段”）。

## 3.2 `StaticIr`（StateTrait Static IR）

定义：`packages/logix-core/src/internal/state-trait/ir.ts`

| 字段         | 类型             | 含义                                 | 来源/规则                                                                     |
| ------------ | ---------------- | ------------------------------------ | ----------------------------------------------------------------------------- |
| `version`    | `string`         | Static IR 协议版本                   | 默认 `"009"`                                                                  |
| `moduleId`   | `string`         | 所属模块 id                          | 调用方传入                                                                    |
| `digest`     | `string`         | **稳定摘要**（用于 drift detection） | `stir:${version}:${fnv1a32(stableStringify({version,moduleId,nodes,edges}))}` |
| `nodes`      | `StaticIrNode[]` | DAG 的节点（通常对应 plan step）     | 来自 `StateTraitProgram.plan.steps`                                           |
| `edges`      | `StaticIrEdge[]` | DAG 的边（依赖关系）                 | 来自 `StateTraitProgram.graph.edges`                                          |
| `conflicts?` | `unknown[]`      | 预留：冲突/诊断                      | 当前实现可选                                                                  |

`StaticIrNode`：

| 字段             | 类型                                                             | 含义                                                               |
| ---------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------ |
| `nodeId`         | `string`                                                         | plan step id（稳定）                                               |
| `kind`           | `string`                                                         | `"computed" \| "link" \| "source" \| "check"`（由 step.kind 映射） |
| `reads`          | `FieldPath[]`                                                    | 该节点显式依赖的字段路径集合（canonical）                          |
| `writes`         | `FieldPath[]`                                                    | 该节点写入的字段路径集合（canonical）；`check` 节点为空            |
| `writesUnknown?` | `boolean`                                                        | target 存在但无法 canonicalize（用于解释路径不规范）               |
| `policy?`        | `Record<string, unknown>`                                        | 预留：策略位                                                       |
| `meta?`          | `{label,description,tags,group,docsUrl,cacheGroup,annotations}?` | 供 UI/文档展示的元信息（来自 trait meta）                          |

`StaticIrEdge`：

| 字段     | 类型     | 含义                                                                                          |
| -------- | -------- | --------------------------------------------------------------------------------------------- |
| `edgeId` | `string` | 边 id（稳定）                                                                                 |
| `from`   | `string` | 源节点 id                                                                                     |
| `to`     | `string` | 目标节点 id                                                                                   |
| `kind`   | `string` | 当前主要为 `"computed" \| "link" \| "source-dep" \| "check-dep"`（见 `state-trait/model.ts`） |

> **读图建议**：把 `nodes[].writes` 当作“写集合”，`reads` 当作“读集合”，再结合 `edges` 画出依赖闭包；这也是 `IrPage` 的 StaticIR 面板为什么能做 deps/impact 的原因。

## 3.3 `ModuleManifestDiff`（Manifest Diff IR）

定义：`packages/logix-core/src/internal/reflection/diff.ts`

| 字段               | 类型                           | 含义                                                    |
| ------------------ | ------------------------------ | ------------------------------------------------------- |
| `version`          | `string`                       | Diff 协议版本（当前 `"025"`）                           |
| `moduleId`         | `string`                       | 目标模块 id（after.moduleId）                           |
| `before` / `after` | `{ digest, manifestVersion? }` | 对比基线（用于审计与 cache）                            |
| `verdict`          | `"PASS" \| "WARN" \| "FAIL"`   | `BREAKING>0 → FAIL`；否则 `RISKY>0 → WARN`；否则 `PASS` |
| `changes`          | `ModuleManifestDiffChange[]`   | 变更列表（顺序稳定）                                    |
| `summary`          | `{ breaking, risky, info }`    | 各级别计数                                              |

`ModuleManifestDiffChange`：

| 字段       | 类型                              | 含义                               |
| ---------- | --------------------------------- | ---------------------------------- |
| `severity` | `"BREAKING" \| "RISKY" \| "INFO"` | 变更严重级别                       |
| `code`     | `string`                          | 稳定变更码（用于 CI/规则引擎）     |
| `pointer?` | `string`                          | JSON Pointer（例如 `"/moduleId"`） |
| `message?` | `string`                          | 人类可读提示                       |
| `details?` | `JsonValue`                       | 可选结构化细节（必须可序列化）     |

## 3.4 `TrialRunReport`（受控试跑报告）

定义：`packages/logix-core/src/internal/observability/trialRunModule.ts`

| 字段           | 类型                       | 含义                                                      |
| -------------- | -------------------------- | --------------------------------------------------------- |
| `runId`        | `string`                   | 会话 id（建议调用方显式提供，避免不可对比）               |
| `ok`           | `boolean`                  | boot 成功且 scope close 成功                              |
| `manifest?`    | `ModuleManifest`           | best-effort：即使失败也尽量给结构摘要                     |
| `staticIr?`    | `StaticIr`                 | best-effort：便于失败解释与 drift 对比                    |
| `artifacts?`   | `TrialRunArtifacts`        | 031：补充静态 IR 槽位（`artifactKey → ArtifactEnvelope`） |
| `environment?` | `EnvironmentIr`            | 依赖观测摘要（best-effort）                               |
| `servicePortsAlignment?` | `{moduleId, declared, missingRequired, missingOptional?}` | 声明端口 ↔ 环境可 resolve 对齐检查（端口级定位）          |
| `evidence?`    | `EvidencePackage`          | Dynamic Trace（可裁剪 maxEvents）                         |
| `error?`       | `SerializableErrorSummary` | 失败分类（`code/hint` 是关键）                            |
| `summary?`     | `unknown`                  | 预留位（当前主要用于 Oversized 的裁剪说明）               |

`TrialRunModuleOptions`（与 IrPage 可调参数对齐）：

| 字段                | 含义                                                                                       |
| ------------------- | ------------------------------------------------------------------------------------------ |
| `diagnosticsLevel`  | `"off" \| "light" \| "full"`：控制导出的事件/字段丰满度（影响 `debug:event` 的 meta 口径） |
| `maxEvents`         | EvidencePackage.events 的尾部裁剪上限（保持最近事件）                                      |
| `trialRunTimeoutMs` | boot 窗口超时（超时会中断 boot fiber 并返回 `TrialRunTimeout`）                            |
| `closeScopeTimeout` | scope close 超时（对应 `DisposeTimeout`）                                                  |
| `buildEnv`          | BuildEnv 的 config/hostKind/configProvider（用于 config 观测与缺失诊断）                   |
| `layer`             | 注入本次试跑所需的 Layer（常见用于提供缺失服务 mock）                                      |
| `budgets.maxBytes`  | 约束整个 TrialRunReport JSON 体积；超限会返回 `Oversized` 并 drop 重字段                   |

`TrialRunArtifacts`（031）要点：

- key 必须版本化：`@scope/name@vN`
- value 是统一的 `ArtifactEnvelope`：显式表达 `ok/error/truncated/budgetBytes/actualBytes/digest`
- kit 通过 `Logix.Observability.registerTrialRunArtifactExporter(module.tag, exporter)` 挂接导出（OCP；无全局单例）

`TrialRunReport.error.code` 常见值（详述见 [`06-reflection-and-trial-run.md`](06-reflection-and-trial-run.md)）：

- `MissingDependency`：构建态缺失服务/配置（必须给出缺失清单）
- `TrialRunTimeout`：boot 阶段阻塞/悬挂
- `DisposeTimeout`：释放收束超时（资源/监听器/fiber 未关闭）
- `Oversized`：报告体积超预算
- `RuntimeFailure`：兜底运行时失败

## 3.5 `EnvironmentIr`（依赖观测摘要）

定义：同 `TrialRunReport` 文件内 `EnvironmentIr`

| 字段                       | 类型                      | 含义                                   | 生成规则                                                                        |
| -------------------------- | ------------------------- | -------------------------------------- | ------------------------------------------------------------------------------- |
| `tagIds`                   | `string[]`                | best-effort：服务依赖集合（含缺失）    | `runtimeServicesEvidence.bindings[].serviceId` ∪ `missingServices`，去重排序    |
| `configKeys`               | `string[]`                | best-effort：config key 集合（含缺失） | `buildEnv.config` 中“提供且非 undefined”的 keys ∪ `missingConfigKeys`，去重排序 |
| `missingServices`          | `string[]`                | 缺失服务 id                            | 从 boot failure 的 Cause 中解析（ConstructionGuard / message heuristics）       |
| `missingConfigKeys`        | `string[]`                | 缺失 config key                        | 从 boot failure 的 Cause 中解析（ConfigError / message heuristics）             |
| `runtimeServicesEvidence?` | `RuntimeServicesEvidence` | 控制面证据（解释 impl 选择）           | 见 3.6                                                                          |
| `notes?`                   | `unknown`                 | 预留位                                 | -                                                                               |

## 3.6 `RuntimeServicesEvidence`（控制面证据）

定义：`packages/logix-core/src/internal/runtime/core/RuntimeKernel.ts`

| 字段               | 类型                                                                             | 含义                                          |
| ------------------ | -------------------------------------------------------------------------------- | --------------------------------------------- |
| `moduleId?`        | `string`                                                                         | 所属模块 id（可选）                           |
| `instanceId`       | `string`                                                                         | 运行时实例锚点（必须非空）                    |
| `scope`            | `"builtin" \| "runtime_default" \| "runtime_module" \| "provider" \| "instance"` | 本实例的最高覆写来源（bindings 的 max scope） |
| `bindings`         | `RuntimeServiceBinding[]`                                                        | 每个 service 的最终 binding（可解释）         |
| `overridesApplied` | `string[]`                                                                       | 规范化覆写记录（便于日志/审计）               |

`RuntimeServiceBinding`：

| 字段           | 类型            | 含义                             |
| -------------- | --------------- | -------------------------------- |
| `serviceId`    | `string`        | 稳定服务标识（Tag id）           |
| `implId?`      | `string`        | 选中的实现 id（可读）            |
| `implVersion?` | `string`        | 选中的实现版本（可读）           |
| `scope`        | `OverrideScope` | 该 binding 的覆写来源            |
| `overridden`   | `boolean`       | 是否发生过覆写（相对 builtin）   |
| `notes?`       | `string`        | 可解释备注（含 fallback 原因等） |

**它怎么进到 Evidence 里**：

- `ModuleRuntime.make` 会把 `RuntimeServicesEvidence` 同时：
  - attach 到 runtime 实例（`RuntimeKernel.setRuntimeServicesEvidence`），供 `TrialRunReport.environment` 读取；
  - 如果 Env 里存在 `EvidenceCollectorTag`（例如 trial run 场景），则写入 collector，从而出现在 `EvidencePackage.summary.runtime.services`。

## 3.7 `EvidencePackage`（Dynamic Trace）

定义：`packages/logix-core/src/internal/observability/evidence.ts`

| 字段              | 类型                    | 含义                                                    |
| ----------------- | ----------------------- | ------------------------------------------------------- |
| `protocolVersion` | `string`                | 证据协议版本（当前 `"v1"`）                             |
| `runId`           | `string`                | 会话 id（与 TrialRunReport.runId 对齐）                 |
| `createdAt`       | `number`                | 导出时间戳（ms）                                        |
| `source`          | `{ host, label? }`      | 来源信息（例如 `{host:"browser",label:"sandbox:/ir"}`） |
| `events`          | `ObservationEnvelope[]` | 事件序列（按 seq 稳定排序）                             |
| `summary?`        | `JsonValue`             | 可选：控制面/静态 IR 等摘要（见下）                     |

`ObservationEnvelope`：

| 字段              | 类型        | 含义                               |
| ----------------- | ----------- | ---------------------------------- |
| `protocolVersion` | `string`    | 事件协议版本（同 EvidencePackage） |
| `runId`           | `string`    | 会话 id                            |
| `seq`             | `number`    | 单调递增事件序号（从 1 开始）      |
| `timestamp`       | `number`    | 事件发生时间（ms）                 |
| `type`            | `string`    | 事件类型（见下）                   |
| `payload`         | `JsonValue` | 事件载荷（必须可 JSON 序列化）     |

**当前最关键的事件类型：`type = "debug:event"`**

- 该事件由 `EvidenceCollector.debugSink` 记录（入口：`packages/logix-core/src/internal/observability/evidenceCollector.ts`）。
- `payload` 是 `RuntimeDebugEventRef` 的 JsonValue 投影（见 [`../observability/09-debugging.md`](../observability/09-debugging.md) 的协议说明）。

**EvidencePackage.summary（控制面 + 静态 IR 摘要）**

summary 由 `EvidenceCollector.exportEvidencePackage()` 生成，形态是一个可选的 JsonValue（按需出现）：

- `summary.runtime.services`：`RuntimeServicesEvidence`（见 3.6）
- `summary.converge.staticIrByDigest`：`Record<string, ConvergeStaticIrExport>`

`ConvergeStaticIrExport` 定义：`packages/logix-core/src/internal/state-trait/converge-ir.ts`

| 字段                         | 类型          | 含义                                             |
| ---------------------------- | ------------- | ------------------------------------------------ |
| `staticIrDigest`             | `string`      | 去重 key（当前为 `${instanceId}:${generation}`） |
| `moduleId`                   | `string`      | 模块 id                                          |
| `instanceId`                 | `string`      | 实例 id                                          |
| `generation`                 | `number`      | converge 静态 IR 代次（结构变化会 bump）         |
| `fieldPaths`                 | `FieldPath[]` | field path table（canonical）                    |
| `stepOutFieldPathIdByStepId` | `number[]`    | stepId → out fieldPathId 映射                    |
| `topoOrder?`                 | `number[]`    | topo 顺序（可选）                                |
| `buildDurationMs?`           | `number`      | build 耗时（可选）                               |

## 3.8 `RuntimeDebugEventRef`（`debug:event` 的 payload）

定义：`packages/logix-core/src/internal/runtime/core/DebugSink.ts`

| 字段            | 类型                       | 含义                                                     |
| --------------- | -------------------------- | -------------------------------------------------------- |
| `eventId`       | `string`                   | 确定性派生（默认 `${instanceId}::e${eventSeq}`）         |
| `eventSeq`      | `number`                   | 单调递增事件序号（见 3.9）                               |
| `moduleId`      | `string`                   | 模块 id                                                  |
| `instanceId`    | `string`                   | 实例 id                                                  |
| `runtimeLabel?` | `string`                   | 可选：runtime 维度分组标签（FiberRef 注入）              |
| `txnSeq`        | `number`                   | instance 内事务序号（0 保留给非事务事件）                |
| `txnId?`        | `string`                   | 可选：确定性派生（默认 `${instanceId}::t${txnSeq}`）     |
| `timestamp`     | `number`                   | 事件时间戳（用于 Timeline 聚合）                         |
| `kind`          | `string`                   | 事件归类（action/state/lifecycle/trait-\*/diagnostic/…） |
| `label`         | `string`                   | UI 展示用短标签（例如 actionTag / phase name / code）    |
| `meta?`         | `JsonValue`                | 可选：事件细节（Slim、可序列化、受预算裁剪）             |
| `errorSummary?` | `SerializableErrorSummary` | 可选：错误摘要（禁止透传 raw cause）                     |
| `downgrade?`    | `{ reason? }`              | 可选：降级原因（non_serializable/oversized/unknown）     |

不同 Debug 事件如何映射到 `kind/label/meta`，以及 `DiagnosticsLevel=off|light|full` 的裁剪策略，统一以 [`../observability/09-debugging.md`](../observability/09-debugging.md) 为准（该文档是 Devtools 事件口径的 SSoT）。

## 3.9 稳定锚点：`instanceId / txnSeq / opSeq / eventSeq / runId`

这些锚点决定了“IR 是否可回放/可对齐/可 diff”，它们在链路里的职责不同：

- `runId`：属于 **会话**（RunSession），用于并行隔离与跨进程对齐；Trial Run 要求可注入（CI/平台必须显式给）。
  - 定义：`packages/logix-core/src/internal/observability/runSession.ts`
- `instanceId`：属于 **实例**（ModuleRuntime），用于 Devtools/React 绑定；禁止默认随机化。
  - 生成：`packages/logix-core/src/internal/runtime/ModuleRuntime.ts`（缺省兜底为单调 `i${n}`）
- `txnSeq/txnId`：属于 **事务**（StateTransaction），同一 instance 内单调递增；用于把 action/commit/traits/converge 关联到同一窗口。
  - 生成：`packages/logix-core/src/internal/runtime/core/StateTransaction.ts`
- `opSeq`：属于 **边界操作**（EffectOp/service/source/converge 等），同一 instance 内单调递增。
  - 生成：`packages/logix-core/src/internal/runtime/ModuleRuntime.operation.ts`（在存在 RunSession 时用 `session.local.nextSeq("opSeq", instanceId)` 补齐）
- `eventSeq/eventId`：属于 **导出事件序列**（Evidence/debug:event），同一 instance 内单调递增。
  - 生成：`packages/logix-core/src/internal/observability/evidenceCollector.ts`（用 `session.local.nextSeq("eventSeq", instanceId)`，并传给 `toRuntimeDebugEventRef`）
