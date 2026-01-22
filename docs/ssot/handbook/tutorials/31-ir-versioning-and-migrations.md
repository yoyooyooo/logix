---
title: IR 版本化与迁移教程 · digest 前缀、protocolVersion 与 forward-only 演进（从 0 到 1）
status: draft
version: 1
---

# IR 版本化与迁移教程 · digest 前缀、protocolVersion 与 forward-only 演进（从 0 到 1）

> **定位**：本文面向维护者/平台开发者，回答三个高频问题：  
> 1) “这个 IR/证据包/工件的版本号到底是什么口径？”  
> 2) “什么时候必须 bump 版本？什么时候只加字段就行？”  
> 3) “forward-only（无兼容层）怎么做迁移，才能既敢破坏又不失控？”  
> **先修**：建议先读 `docs/ssot/handbook/tutorials/01-digest-diff-anchors.md`（digest/diff/anchors）与 `docs/ssot/handbook/tutorials/28-evidence-collector-and-trialrun.md`（TrialRun/Evidence）。

## 0. 最短阅读路径（10 分钟上手）

1. 先读「1.2 四类版本」：不要把 `manifestVersion`、`digest`、`protocolVersion`、`@vN` 混成一个东西。  
2. 再读「2.1 ModuleManifest（manifest:067）」与「2.2 Traits Static IR（stir:009）」：理解“版本字段 + digest 前缀”如何绑定。  
3. 最后读「3.1 何时 bump 版本」：把“触发条件清单”记住，就不会踩“静默漂移”的坑。  

## 1. 心智模型（版本是什么，不是什么）

### 1.1 forward-only 的根本约束：不做兼容层，只做迁移说明与工具

本仓的演进策略是 forward-only：不为了兼容历史版本而在运行时堆叠 shim/deprecation。  
这意味着：

- 遇到“版本不匹配/未知版本”，**倾向 fail-fast**，并给出升级/迁移指引；  
- 迁移的承载物不是兼容层，而是：`migration.md`（迁移说明）+ diff 报告 + rewriter/脚本（若必要）；  
- 版本治理的目标不是“永远不破”，而是“破坏也可控、可解释、可回放”。  

参考（spec 裁决）：`specs/075-flow-program-codegen-ir/spec.md`（版本治理严格 fail-fast、无兼容层）。

### 1.2 四类版本：别把它们当成同一种“版本号”

在本仓里，“版本”至少分四类（每类解决的问题不同）：

1. **IR Schema Version（字段口径版本）**  
   例：`ModuleManifest.manifestVersion = '067'`、`StaticIr.version = '009'`。  
   作用：告诉消费者“字段语义口径是什么”，并作为 digest base 的一部分。
2. **Digest Prefix Version（内容寻址/判等前缀）**  
   例：`manifest:067:<hash>`、`stir:009:<hash>`、`artifact:031:<hash>`。  
   作用：把“语义边界”压缩成稳定引用（stable reference）。前缀通常与 schema version 绑定（但不要求永远一致）。  
3. **Protocol Version（跨系统交换协议版本）**  
   例：`OBSERVABILITY_PROTOCOL_VERSION = 'v1'`（EvidencePackage）。  
   作用：不同工具/进程/机器之间交换数据时的协议口径（import/export）。  
4. **ID 里的版本（`@vN` / `...@v1`）**  
   例：TrialRun artifact key `@logixjs/module.portSpec@v1`、projectorId `schema-ast@v1`。  
   作用：把“某类导出器/投影器/工件类型”做可枚举、可治理的版本化标识（类似 plugin contract）。

结论：**“版本”不是一个数字，而是一组互相约束的字段**。写迁移时必须明确你在 bump 哪一类。

### 1.3 fail-fast vs forward parse：同一个版本内允许扩展，但禁止猜测

推荐口径（并在 specs 中已写出）：`specs/073-logix-external-store-tick/contracts/ir.md`

- `version` 单调递增；解析器必须先按 `version` 分发到对应 schema（禁止“猜字段”）。  
- 同一 `version` 内允许新增可选字段；解析器应忽略未知字段（向前兼容解析）。  
- 遇到未知 `version` 必须 fail-fast 并提示升级（避免静默误解释导致证据漂移）。  

这三条是版本治理的“安全底线”：你可以大胆前进，但不能静默误解释。

## 2. 现状：仓库里有哪些版本化 IR/协议/工件（从 0 到 1 串起来）

### 2.1 `ModuleManifest`（`manifestVersion=067` / `manifest:067:*`）

入口：

- 导出：`packages/logix-core/src/internal/reflection/manifest.ts`（`extractManifest`）
- diff：`packages/logix-core/src/internal/reflection/diff.ts`（`diffManifest`）
- 公共 API：`packages/logix-core/src/Reflection.ts`（`Reflection.extractManifest` / `Reflection.diffManifest`）

关键点（为什么这个设计对迁移友好）：

- `digest` 是对 **digestBase** 做 `stableStringify + fnv1a32` 得到的：  
  - `digestBase` 明确包含：`manifestVersion/moduleId/actionKeys/actions/effects/schemaKeys/logicUnits/staticIrDigest`  
  - `digestBase` 明确排除：`source/meta/staticIr(本体)`  
  - 这让 `digest` 能作为 CI/cache 的 cheap gate，同时 `source/meta` 仍可作为 explainable diff 的附属信息。  
- budgets（`maxBytes`）发生时会裁剪 manifest，但 digest 已经先算完：  
  - 因此“预算裁剪”不会破坏“内容寻址”（digest 指向原始结构口径）。  

### 2.2 `Traits Static IR`（`version=009` / `stir:009:*`）

入口：

- 导出：`packages/logix-core/src/internal/state-trait/ir.ts`（`exportStaticIr`，默认 `version='009'`）
- 反射包装：`packages/logix-core/src/internal/reflection/staticIr.ts`
- Manifest 关联：`extractManifest(... includeStaticIr)` 会把 `staticIr.digest` 写进 digestBase（`staticIrDigest`）

关键点（最容易踩坑的“版本触发器”）：

- `digest` 计算对象是 `{ version, moduleId, nodes, edges }`。  
  - `nodes`/`edges` 的顺序、字段归一化（例如 fieldPath canonicalize）直接影响 digest。  
  - 所以 **“排序规则/归一化规则变化”本质上是 schema 语义变化**，通常要 bump version。  

### 2.3 `EvidencePackage`（`protocolVersion=v1`）

入口：

- 协议定义：`packages/logix-core/src/internal/observability/evidence.ts`（`OBSERVABILITY_PROTOCOL_VERSION`、`exportEvidencePackage`、`importEvidencePackage`）
- 写入 sink：`packages/logix-core/src/internal/observability/runSession.ts`（`makeEvidenceSink`）
- DevtoolsHub 导出：`packages/logix-core/src/internal/runtime/core/DevtoolsHub.ts`（`exportDevtoolsEvidencePackage`）

关键点：

- EvidencePackage 的事件 envelope 有固定字段：`protocolVersion/runId/seq/timestamp/type/payload`，并在导出时按 `seq` 排序，保证可 diff。  
- `protocolVersion` 是交换协议口径，不应作为“可比性锚点”（可比性应由 digest/anchors 承担）。  

### 2.4 TrialRun Artifacts：`ArtifactKey=@...@vN` + `artifact:031:*`（内容寻址）

入口：

- ArtifactKey 规则：`packages/logix-core/src/internal/observability/artifacts/model.ts`（`artifactKeySchemaPattern`）
- digest：`packages/logix-core/src/internal/observability/artifacts/digest.ts`（`artifact:031:*`）
- 收集与预算裁剪：`packages/logix-core/src/internal/observability/artifacts/collect.ts`（`collectTrialRunArtifacts`）

关键点：

- artifact 的“类型”用 `@org/name@vN` 表达（可治理/可枚举）。  
- artifact 的“内容”用 `artifact:031:*` 表达（内容寻址/去重存档）。  
- 预算裁剪不会改变 digest：value 被裁剪为 `_tag: 'oversized'` 的 preview，但 digest 指向原始 stable JSON。  

### 2.5 PortSpec（一个具体 artifact）：`PORT_SPEC_PROTOCOL_VERSION=v1`

入口：`packages/logix-core/src/internal/reflection/ports/exportPortSpec.ts`

- `PORT_SPEC_PROTOCOL_VERSION = 'v1'`  
- `PORT_SPEC_ARTIFACT_KEY = '@logixjs/module.portSpec@v1'`  

这是“ID 里版本（@v1）”的一种典型用法：平台可以把它当作一个稳定工件类型来消费/升级。

### 2.6 Diff 报告也是 IR：`ModuleManifestDiff.version = '025'`

入口：`packages/logix-core/src/internal/reflection/diff.ts`

关键点：

- diff 输出本身是一个“可搬运的 IR”（CI gate / UI 复用），因此也需要版本字段：`version: '025'`。  
- changes 稳定排序（severity→code→pointer），避免 diff 自己产生噪音。  
- `metaAllowlist` 提供“降噪策略”的显式入口（否则 meta 变化默认 RISKY）。  

### 2.7 Kernel Contract（另一个协议化 diff）：`KernelContractVerificationResult.version = 'v1'`

入口：`packages/logix-core/src/internal/reflection/kernelContract.ts`

关键点：

- 它基于 EvidencePackage 中的 `debug:event` 还原“EffectOp trace”并做 contract diff。  
- 它会把原始 instanceId 映射成 `i1/i2...`，降低跨运行噪音（但前提是 anchors/opSeq 语义稳定）。  
- 它也有自己的 `VERSION = 'v1'`，说明“报告结构/解释口径”是独立演进的协议。  

## 3. 何时必须 bump 版本（触发条件清单）

> 这节是本文的核心：你只要遵守这些触发条件，版本治理基本不会走偏。

### 3.1 必须 bump（否则会产生静默漂移）

对任意 IR/协议，如果发生以下任一类变化，通常应 bump 对应版本（schema/digest/protocol/ID）：

1. **字段语义变化**：同名字段含义变了、单位变了、枚举含义变了、默认值语义变了。  
2. **新增必填字段**：旧消费者无法在不猜测的前提下解释。  
3. **删除/重命名字段**：旧字段不再存在或语义迁移（必须让工具显式感知）。  
4. **排序/归一化规则变化**：  
   - `nodes/edges/actions/effects` 的稳定排序口径变了；  
   - fieldPath canonicalize 规则变了；  
   - “去重/合并”的规则变了。  
5. **budget/truncation 的协议语义变化**：  
   - 例如裁剪阈值、裁剪形态、裁剪后字段含义变化；  
   - 例如 `projectJsonValue` 的“oversized/nonSerializable”口径变化。  
6. **digest base 变化**：digest 参与字段增删改（哪怕 IR 本体不变）。  
7. **锚点命名/对齐规则变化**：例如 `programId/nodeId` 改成 `workflowId/stepKey` 这类“回链协议字段”变化。  
8. **协议 envelope 变化**：EvidencePackage 的 `ObservationEnvelope` 字段变化或 type/payload 语义变化。  
9. **稳定序列化算法变化**：`stableStringify` 的规则变化会导致全仓 digest 漂移，必须作为一次显式的版本演进事件处理。  

### 3.2 不必 bump（但要写清楚扩展口径）

以下变化通常可以不 bump（在同一 version 内扩展），但要满足“禁止猜测 + 可忽略未知字段”：

- 新增 **可选字段**，且旧消费者忽略它不会误解释（最多是信息缺失，而不是语义错误）。  
- 新增 **新的 `meta` key**，并把它当作 RISKY 或放入 allowlist（由上层显式治理）。  
- 新增 **新的 artifactKey**（一个新工件类型），旧平台不消费即可。  

经验法则：能“忽略而不误解”才允许不 bump；只要可能误解，就必须 bump。

## 4. forward-only 迁移怎么做（不靠兼容层）

### 4.1 迁移的三件套：说明（human）+ diff（machine）+ 工具（optional）

迁移最小闭环建议始终包含：

1. **Migration Notes（人读）**：说明“为什么变、变了什么、怎么迁”。  
   - 例：`specs/075-flow-program-codegen-ir/contracts/migration.md`
2. **Diff Report（机读）**：让 CI/UI 能 gate、能生成 checklist。  
   - 例：`Reflection.diffManifest`（`packages/logix-core/src/internal/reflection/diff.ts`）
3. **迁移工具（可选）**：当改动面太大或需要批量改写时，提供脚本/rewriter。  
   - 例：spec 025 提到的 inspect/diff 产物（`scripts/ir/inspect-module.ts`）用于复跑对比（若你要扩展它，建议把它当作工具链的一部分，而不是临时脚本）。

### 4.2 一个标准的“版本 bump”步骤（推荐 checklist）

当你决定 bump 一个 IR/协议版本时，建议按以下顺序执行（避免遗漏）：

1. **先写迁移说明**：在对应 spec/contracts 下加 `migration.md`，明确 from→to 的语义差异与替代写法。  
2. **改 exporter**：把新版本固化到导出端（`manifestVersion`/`StaticIr.version`/`PROTOCOL_VERSION`/`@vN`）。  
3. **改 digest 前缀**：让 digest 把版本边界显式化（`manifest:067`/`stir:009`/`artifact:031`）。  
4. **改消费者（parser）**：  
   - 先按 version 分发；  
   - 未知 version fail-fast（不要“猜字段”）；  
   - 同 version 内忽略未知字段。  
5. **改 diff/对齐工具**：  
   - diff 口径若变了，给 diff 报告 bump 自己的 version（例如 `ModuleManifestDiff.version`）；  
   - 如果只是新增字段，确保 diff 输出稳定排序不变。  
6. **补测试/回归**：至少覆盖 “确定性 + 预算裁剪 + session 隔离”。  
   - 例：`packages/logix-core/test/observability/Observability.TrialRun.SessionIsolation.test.ts`（summary 不跨 session 泄漏）  
7. **同步 SSoT**：把新的版本字段/迁移口径回写到 `docs/ssot/platform/**` / `docs/ssot/runtime/**` 的裁决点（教程只引用）。  

### 4.3 避免“版本失控”的两个硬约束

1. **不要让同一语义边界出现两个版本字段**（并行真相源）。  
   - 例如 manifestVersion 与 digest 前缀应保持一致或可解释映射。  
2. **不要用运行时兼容层隐藏破坏性变化**。  
   - 兼容层会把“迁移成本”变成“永久成本”，而且极难诊断（尤其会污染性能与证据链）。  

## 5. 代码锚点（Code Anchors）

以下锚点足以覆盖本仓 IR 版本治理的主要事实源：

1. `packages/logix-core/src/internal/digest.ts`：`stableStringify` / `fnv1a32`（全仓 digest 算法 SSoT）。
2. `packages/logix-core/src/internal/reflection/manifest.ts`：`extractManifest` / `manifestVersion='067'` / `digestOf`（manifest:067）。
3. `packages/logix-core/src/internal/reflection/diff.ts`：`diffManifest` / `ModuleManifestDiff.version='025'`（稳定 diff 口径）。
4. `packages/logix-core/src/Reflection.ts`：公共入口 `Reflection.extractManifest/diffManifest/exportStaticIr`。
5. `packages/logix-core/src/internal/state-trait/ir.ts`：`exportStaticIr` / `version='009'` / `stir:${version}:...`。
6. `packages/logix-core/src/internal/reflection/staticIr.ts`：反射包装（把 traits 静态 IR 暴露给平台/CI）。
7. `packages/logix-core/src/internal/observability/evidence.ts`：`OBSERVABILITY_PROTOCOL_VERSION='v1'` / export/import。
8. `packages/logix-core/src/internal/observability/runSession.ts`：Evidence sink（`seq` 排序、session-local state）。
9. `packages/logix-core/src/internal/runtime/core/DevtoolsHub.ts`：EvidencePackage 导出（DevtoolsHub→Evidence）。
10. `packages/logix-core/src/internal/observability/artifacts/model.ts`：ArtifactKey 模式（`@...@vN`）。
11. `packages/logix-core/src/internal/observability/artifacts/digest.ts`：artifact:031（内容寻址）。
12. `packages/logix-core/src/internal/observability/artifacts/collect.ts`：artifact budgets + deterministic truncate（digest 指向原始 stable JSON）。
13. `packages/logix-core/src/internal/reflection/ports/exportPortSpec.ts`：`PORT_SPEC_PROTOCOL_VERSION` 与 `@logixjs/module.portSpec@v1`。
14. `packages/logix-core/src/internal/reflection/kernelContract.ts`：KernelContract 的 v1 报告协议与 trace.digest（基于 EvidencePackage）。
15. `specs/075-flow-program-codegen-ir/contracts/migration.md`：forward-only 迁移说明模板（出码层/Workflow IR）。
16. `specs/073-logix-external-store-tick/contracts/ir.md`：版本升级策略（fail-fast/忽略未知字段/禁止猜测）。

## 6. 常见坑（Anti-patterns）

- 只改了 IR 结构，但没 bump 版本：导致“看似兼容，实际误解释”，这是最危险的漂移。  
- 用兼容层吞掉破坏：短期爽、长期税（性能/诊断/心智）会指数上升。  
- 把时间戳/随机数写进可 diff 的产物：破坏可比性，CI/缓存/审阅都会失效。  
- 修改排序/归一化规则却不 bump：digest/diff 噪音会在未来某一天集中爆发。  
- 在未知版本上“尽力解析”：这会产生静默误解释，属于必须禁止的行为。  
