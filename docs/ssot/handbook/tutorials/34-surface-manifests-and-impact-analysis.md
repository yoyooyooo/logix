---
title: Manifest 家族教程 · ModuleManifest / ManifestDiff / 预算裁剪（从 0 到 1）
status: draft
version: 1
---

# Manifest 家族教程 · ModuleManifest / ManifestDiff / 预算裁剪（从 0 到 1）

> **定位**：本文讲清楚 `@logixjs/core` 的 Manifest IR（结构摘要）如何用于 **影响面分析（impact analysis）**：从模块对象提取 `ModuleManifest`，再用 `diffManifest` 输出稳定差异，用于 CI 门禁与 Devtools/UI 共享口径。  
> **裁决来源**：Manifest/Diff/TrialRun 的字段语义以 SSoT 为准：`docs/ssot/runtime/logix-core/api/06-reflection-and-trial-run.md` 与 `docs/ssot/runtime/logix-core/api/07-ir-pipeline-from-irpage.03-ir-data-model.md`。

## 0. 最短阅读路径（10 分钟上手）

1. 读「1.1 Manifest 是什么：结构摘要，不是执行计划」  
2. 读「2.1 `Reflection.extractManifest`：从模块对象提取 Manifest」  
3. 读「2.3 digest 口径：稳定摘要用于降噪与 join」  
4. 读「2.4 预算裁剪：超限时如何 deterministic drop」  
5. 最后读「3.1/3.2」两个剧本：CI breaking 门禁与 meta 噪音降噪。

如果你想把“Manifest/StaticIR/Diff/TrialRunReport/EvidencePackage”统一成一张 IR 心智模型图：先读 `docs/ssot/runtime/logix-core/api/07-ir-pipeline-from-irpage.00-mental-model.md`。

## 1. 心智模型（Manifest 在系统里扮演什么角色）

### 1.1 Manifest 是“结构摘要”（Surface），不是执行计划（Plan）

`ModuleManifest` 的目标不是“让运行时执行更快”，而是：

- **让平台/CI/Devtools 能读懂模块结构**（actions/effects/logicUnits/schemaKeys…）；  
- **让差异可机器判定**（breaking/risky/info）；  
- **让成本可控**：Manifest 可预算裁剪，事件流不携带 IR 全量；  
- **让对齐可落地**：通过 digest 把“动态证据”join 回“静态结构”。

执行性能来自运行时内部的 `RuntimePlan`/索引结构（internal），不应把热路径成本转嫁到 Manifest 的扫描/序列化上。

### 1.2 为什么要做 impact analysis：PR 审阅、智能回归、平台面板

当你有了稳定的 Manifest 与 Diff，你可以在“业务代码变更”与“平台风险”之间加一层可解释门禁：

- PR 里新增/删除 actionTag：属于 breaking，应该强提示甚至 fail。  
- SchemaKeys 变化：可能影响外部工具/迁移策略。  
- logicUnits 变化：属于“结构变更”，可能影响 provenance/诊断/回放锚点。  
- staticIr digest 变化：意味着约束闭包结构变化，需要联动回归与迁移说明。  

而这些分析不需要跑 UI，不需要读 AST；只要拿到模块对象就可以提取。

## 2. 核心链路（从 0 到 1：Extract → Digest → Budget → Diff）

### 2.1 `Reflection.extractManifest(module, options?)`：从模块对象提取

API（用户侧入口）：

- `packages/logix-core/src/Reflection.ts` → `extractManifest(...)`

实现（事实源）：

- `packages/logix-core/src/internal/reflection/manifest.ts`

关键点：

- 输入是 `ModuleImpl` 或 `AnyModule`（与 program runner 同形），不读源码 AST。  
- 输出必须是 JSON-safe 的结构摘要（`JsonValue` 约束见 `packages/logix-core/src/internal/observability/jsonValue.ts`）。

### 2.2 Manifest 的字段族（你该关注哪些）

权威数据模型说明：`docs/ssot/runtime/logix-core/api/07-ir-pipeline-from-irpage.03-ir-data-model.md#31-modulemanifest`

建议按“影响面分析”的视角阅读：

- **身份锚点**：`moduleId`（长期语义锚点）、`manifestVersion`（协议版本）  
- **Action Surface**：`actionKeys[]` + `actions[]`（payload.kind、primaryReducer、source）  
- **Effect Surface**：`effects[]`（当前仅导出声明式 effects：`Module.make({ effects })`；按 `(actionTag, sourceKey)` 去重排序）  
- **结构单元**：`logicUnits[]`（已挂载 logic 单元摘要）  
- **扩展元信息**：`meta`（必须 JsonValue）与 `source`（仅用于跳转解释）  
- **静态 IR 引用**：`staticIr.digest`（当 includeStaticIr=true；或以 digest 引用为主）  

### 2.3 digest 口径：稳定摘要用于降噪与 join（但不携带全量）

事实源：

- `packages/logix-core/src/internal/reflection/manifest.ts`
- `docs/ssot/runtime/logix-core/api/07-ir-pipeline-from-irpage.03-ir-data-model.md`（digestBase 口径说明）

关键口径（非常重要）：

- `digest` 只由结构字段决定（用于 diff/降噪/缓存）。  
- **不包含** `meta/source/staticIr` 的“本体”，避免把解释性噪音变成合同锚点。  
- 但会包含 `staticIr.digest`（让结构变化能联动到约束闭包变化）。

直觉：`digest` 是“结构版本号”，不是“全文 hash”。它的目的不是防篡改，而是做 drift detection 与 UI join。

### 2.4 预算裁剪（maxBytes）：超限时如何 deterministic drop

事实源：

- `packages/logix-core/src/internal/reflection/manifest.ts` → `applyMaxBytes`
- SSoT 说明：`docs/ssot/runtime/logix-core/api/07-ir-pipeline-from-irpage.03-ir-data-model.md`（裁剪顺序）

当 Manifest 的 UTF‑8 bytes 超过 `options.budgets.maxBytes` 时，会按固定顺序裁剪（确定性）：

1. `meta`  
2. `source`  
3. `staticIr`  
4. `logicUnits`  
5. `schemaKeys`  
6. `effects`  
7. `actions`（必要时二分截断尾部；并同步截断 `actionKeys` 以一致）

裁剪不是 silent：会在 `meta.__logix` 写入：

- `truncated/maxBytes/originalBytes/dropped/truncatedArrays`

这样平台/UI 可以明确解释“为什么字段缺失”，而不是让读者以为“没有这个信息”。

### 2.5 `Reflection.diffManifest(before, after, options?)`：稳定差异与 verdict

事实源：

- `packages/logix-core/src/internal/reflection/diff.ts` → `diffManifest`
- 入口导出：`packages/logix-core/src/Reflection.ts`

Diff 输出：

- `changes[]`：稳定顺序（同输入同序）  
- `severity`：`BREAKING | RISKY | INFO`  
- `verdict`：存在 BREAKING → `FAIL`；否则若存在 RISKY → `WARN`；否则 `PASS`  

对 meta 的降噪策略：

- 默认：meta 变化按 `RISKY` 处理（因为它可能影响平台行为）。  
- 可选：`metaAllowlist`（只 diff allowlisted keys，其它忽略）。

## 3. 剧本集（用例驱动：CI/平台/排障）

### 3.1 剧本 A：CI 里做 breaking 门禁（actionKeys/schemaKeys）

目标：阻止“删 actionTag / 删 schema key”这类明显 breaking 的变更悄悄上线。

做法：

1. 在 before/after 构建物上各提取一次 manifest：`Reflection.extractManifest(module, { includeStaticIr: true })`。  
2. 做 diff：`Reflection.diffManifest(before, after)`。  
3. 如果 verdict=`FAIL`：直接 fail CI，并把 `changes[]` 打到报告里（pointer+details）。

你会得到：

- 不依赖 AST 的结构门禁；  
- 变更原因可解释（removed/added 列表稳定排序）；  
- 与 Devtools UI 复用同一口径（不再“CI 一套、UI 一套”）。

### 3.2 剧本 B：meta 噪音很大，diff 总是 WARN，怎么降噪但不失控

典型原因：

- meta 里塞了过多“易变字段”（如时间戳、随机 id、计数器）。  
- 或者 meta 里混入了“解释性字段”和“合同字段”，导致 diff 总是 RISKY。

推荐策略（从强到弱）：

1. **先治理 meta 内容**：把非语义字段移出 meta（或放进 `meta.__logix` 的解释分区，并明确不参与合同）。  
2. **再用 allowlist**：在 `diffManifest(options)` 里只 diff 某些 metaKey（剩余忽略）。  
3. **禁止把 meta 当执行开关**：真正的合同字段应进入 Manifest/StaticIR 的明确字段，而不是埋在 meta 里。

### 3.3 剧本 C：Manifest 超预算被裁剪了，平台 UI 该如何解释

你应该做两件事：

1. 读取 `meta.__logix`：展示 `originalBytes/maxBytes/dropped/truncatedArrays`。  
2. 提示用户“如何缩小输出”：例如降低 `includeStaticIr`、调小 effects/actions 数量、或增大预算（CI/平台可配置）。

不要做的事：

- 不要把裁剪当成“字段不存在”；  
- 不要让裁剪结果进入合同锚点（digestBase 已避免）。

### 3.4 剧本 D：我要做“影响面分析面板”，哪些 diff 该展示为 BREAKING/RISKY/INFO

仓库当前 diff 口径（事实源：`packages/logix-core/src/internal/reflection/diff.ts`）已经给出一套默认分级：

- **BREAKING**：删除 actionKeys/schemaKeys、logicUnits 移除或 kind 改变、moduleId 改变。  
- **RISKY**：staticIr digest 变化、meta 变化（默认）、logicUnits 的 name/derived 变化等。  
- **INFO**：新增 actionKeys/schemaKeys、manifestVersion 变化等。

建议 UI 的最小呈现：

- 顶部 summary（breaking/risky/info counts）  
- 列表按 severity 分组或按 rank 排序（与代码 SEVERITY_RANK 保持一致）  
- 每条 change 展示 `code/pointer/message/details`（pointer 是定位工具链的关键）

## 4. 代码锚点（Code Anchors）

1. `docs/ssot/runtime/logix-core/api/06-reflection-and-trial-run.md`：Reflection/TrialRun 的裁决与用途。  
2. `docs/ssot/runtime/logix-core/api/07-ir-pipeline-from-irpage.03-ir-data-model.md`：Manifest/StaticIR/Diff 的字段语义与裁剪顺序。  
3. `packages/logix-core/src/Reflection.ts`：`extractManifest/diffManifest/exportStaticIr` 的 public API。  
4. `packages/logix-core/src/internal/reflection/manifest.ts`：ModuleManifest 结构、digestBase 与 budgets 裁剪实现。  
5. `packages/logix-core/src/internal/reflection/diff.ts`：ModuleManifestDiff 生成与 severity/verdict 口径。  
6. `packages/logix-core/src/internal/observability/jsonValue.ts`：JsonValue hard gate（meta 必须可序列化）。  

## 5. 验证方式（Evidence）

最小验证建议：

1. **稳定性**：同一 module 输入重复提取 manifest，`digest` 与所有数组顺序必须一致。  
2. **裁剪确定性**：固定 maxBytes 下，裁剪结果与 `meta.__logix` 的 dropped/truncatedArrays 必须一致（同输入同输出）。  
3. **diff 稳定性**：同一 before/after 输入重复 diff，`changes[]` 顺序必须一致。  

## 6. 常见坑（Anti-patterns）

- 把 manifest 当执行计划：试图在热路径用它做扫描/路由（违背 Root IR/RuntimePlan 分层）。  
- 在 meta 里塞不可序列化对象：会被 JsonValue gate 丢弃，导致信息缺失且难以对齐。  
- 让 source/meta 成为 digestBase：会把解释噪音变成合同锚点，导致 diff 永远不稳定。  
- 没有 budgets：平台/CI 一旦遇到大模块，产物体积不可控，链路会被 oversized 拖垮。  
