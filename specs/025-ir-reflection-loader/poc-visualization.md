# POC: IR 平台可视化（小而美、可复用）

**Date**: 2025-12-24  
**Feature**: `specs/025-ir-reflection-loader/spec.md`（025）  
**Status**: Draft（用于指导 POC 交付，不作为 runtime 对外契约）

> 目标：把 025 产出的 IR（Manifest/StaticIR/TrialRunReport/RuntimeServicesEvidence/EvidencePackage）做成一组**可嵌入、可复用、可独立运行**的小组件/小页面（POC），未来平台侧“拿来就用”。  
> 约束：POC **只消费 JSON schema 约束的载荷**（`specs/025-*/contracts/schemas/*` + `specs/020-*` + `specs/005-*`），不依赖 Logix runtime 内部对象图。

## 0.0 前端选型（POC 基座）

> 目标：把“可视化”从一开始就做成 **可嵌入组件库**，而不是绑定在某个 demo App 上的临时页面。

### Host（运行容器）

- 首选落点：`examples/logix-sandbox-mvp/`（React + Vite + `react-router-dom` + Tailwind v4），直接作为“运行时对齐实验室”的 IR 视角补全。
- 组件复用边界：P0–P4 视图组件只接收 **schema 约束的 JSON 工件**；数据源（preset runner / import / URL）在上层注入（见下文 ArtifactProvider）。

### UI 与交互基座

- UI 组件：优先采用 `shadcn/ui` 的组合方式（Radix + Tailwind + CVA），与 `apps/studio-fe` 保持同一套交互与视觉基座，避免在 POC 内自建第二套组件体系。
- 需要的最小组件集合（建议）：Tabs / Card / Badge / Alert / Button / Dialog / Sheet / ScrollArea / Table / Command（搜索）/ Separator。
- icon：`lucide-react`（同 `apps/studio-fe` 现状）。

### 可视化关键依赖（建议裁决）

- JSON Viewer：优先选用轻量 JSON viewer（折叠/搜索/复制）组件；避免把“解释面板”退化成纯 `<pre>`（可读性与可操作性不足）。
- DAG 可视化：选用“可交互画布 + 可确定布局”的组合（例如 React Flow 类画布 + dagre/elk 布局），保证：
  - 布局可复现（同一输入同一布局）
  - 可局部高亮（Impact/Dependency 子图）
  - 可导出（字段清单 / dot/mermaid 作为附加能力）
- Timeline 大列表：默认 `maxEvents=1000`；若需要支撑更大事件量，必须引入虚拟滚动（避免 UI 卡死）。

### Schema 校验（平台可复用门）

- Import/粘贴/URL 输入的 JSON 在进入视图前，建议用 JSON Schema 做校验（失败显示结构化错误），保证“只消费 schema 定义载荷”的约束可被自动化验证。
- Diff 输出契约：Manifest diff/Breaking 必须消费 `specs/025-ir-reflection-loader/contracts/schemas/module-manifest-diff.schema.json`（与 CI 同口径）。

## 0. 共同骨架（所有 POC 共享）

### 0.1 Artifact 输入（两种模式）

**模式 A：Preset recipes（默认，面向 POC）**

- 选择一个 preset（不同层面默认代码），在浏览器侧（Worker）试运行一次，得到一组 IR 工件。
- 目标：让 POC “开箱即用”，不需要先准备 CI 工件；同时覆盖成功/失败/裁剪/冲突等关键链路。

**模式 B：文件/粘贴 JSON（平台复用入口）**

- 支持：粘贴 JSON、上传文件、从 URL（可选）加载。
- 目标：平台侧可直接丢 CI 工件/本地工件进行查看与 diff；替换数据源不影响视图组件。

> 结论：POC 默认靠 Preset 跑出工件；平台落地靠 Import/Service API 喂同一套 JSON 工件。

#### 模式 A 的实现：Sandbox Provider（浏览器侧试运行 + 预设 recipes）

可以（也推荐）把 POC 的示例数据直接来源于 `@logixjs/sandbox` 的浏览器侧试运行：

- **核心思路**：在 Worker 里执行一段“IR 采集脚本”（preset recipe），最终返回一份**纯 JSON 工件**（manifest/staticIr/trialRunReport/evidence…），交给 P0–P4 视图渲染。
- **关键约束**：不要把 `RunSession` / `Exit` / `ModuleRuntime` 之类运行时对象跨 `postMessage` 回传（含方法/闭包的对象不可结构化克隆）；recipe 必须只返回符合 schema 的 JSON。

建议把 sandbox 侧的数据源抽象成一个接口（平台未来也能用同样接口接入“服务端 inspect API”）：

```ts
type ArtifactBundle = {
  manifest?: unknown
  staticIr?: unknown
  trialRunReport?: unknown
  evidence?: unknown
}

type ArtifactProvider = {
  listPresets(): ReadonlyArray<{ id: string; title: string; outputs: ReadonlyArray<keyof ArtifactBundle> }>
  runPreset(options: { presetId: string; runId: string; budgets?: unknown }): Promise<ArtifactBundle>
}
```

**Budget/Truncation（POC 默认值建议）**

- `maxEvents`: **1000**（默认就要限，避免 Timeline 一上来就把 UI/worker 拖垮）
- `trialRunTimeoutMs`: 3000（预检窗口）
- `closeScopeTimeout`: 1000（释放收束，复用 024）
- `maxBytes`: 500_000（单个工件体积上限；超限必须显式标注/失败）

**预设 recipes（不同层面默认代码）建议至少覆盖：**

- `p0.manifest.basic`：只产出 `ModuleManifest`（结构名片，用于 P0）。
- `p1.staticIr.stateTraitDemo`：产出 `StaticIR`（带 computed/link/check 关系，用于 P1）。
- `p2.preflight.missingService`：产出 `TrialRunReport(ok=false)` + `environment.missingServices[]`（用于 P2 失败链路）。
- `p3.controlPlane.overrideDemo`：产出带 `runtimeServicesEvidence` 的 `TrialRunReport(ok=true)`（用于 P3）。
- `p4.timeline.fullDiagnostics`：产出 `evidence.events[]`（受 `maxEvents`/budgets 约束）+ summary 引用（用于 P4）。

> 这些 preset 并不是“业务代码模板”，而是用于 **生成 IR 工件** 的最小脚本；平台侧未来可以替换 `program module`（来自 024 的入口模块）与 budgets/runId，而 UI 不变。

#### Preset Runner UX（建议）

- 顶部：Preset picker + `runId` 输入（默认 `poc:<presetId>:<seq>`）+ budgets（默认折叠）
- 右侧：Artifacts 概览（本次产出的 manifest/staticIr/trialRun/evidence 是否齐全、各自 digest/runId）
- 主区：P0–P4 Tabs（缺少输入时显示 “Not available（missing artifact）” + 引导跑哪个 preset）
- 底部：导出按钮（导出本次 ArtifactBundle 为 `artifacts.json` / 分拆为多个文件）
- UI 组件：优先使用 `shadcn/ui`（Tabs/Card/Badge/Alert/Dialog/Sheet/Table/Command/ScrollArea 等），保持视觉与交互一致。

---

### 0.1.1 Preset recipes 规范（每个 preset 都要“可解释”）

每个 preset 需要显式声明：

- `outputs`：会产出哪些工件（manifest/staticIr/trialRunReport/evidence）
- `scenario`：它覆盖哪条关键链路（成功/失败/裁剪/冲突/覆写）
- `assertions`（POC 内自检）：跑完后在 UI 侧做最小断言并提示（例如 “StaticIR nodes>=5”）

建议的 5 个 presets（对应 P0–P4）：

1. `p0.manifest.basic`
   - 输出：`manifest`
   - 目标：包含 `schemaKeys/actionKeys/logicUnits/meta/source`，可触发 diff 规则（例如删除/新增 key 的模拟）。
2. `p1.staticIr.stateTraitDemo`
   - 输出：`staticIr`（可选再带 `manifest.staticIr`）
   - 目标：至少一条长度≥3 的 computed 链，保证 “传递依赖（Impact）” 有意义；同时包含一条 link 或 check。
3. `p2.preflight.missingService`
   - 输出：`trialRunReport(ok=false)` + `environment.missingServices[]`
   - 目标：错误分类可行动（missing_service），并带可复制的缺失 serviceId 列表。
4. `p3.controlPlane.overrideDemo`
   - 输出：`trialRunReport(ok=true)` + `environment.runtimeServicesEvidence`（或 `evidence.summary.runtime.services`）
   - 目标：同一 `serviceId` 至少两条 binding，且有 overridden=true 的条目，让解释器能讲清“winner vs overridden”。
5. `p4.timeline.fullDiagnostics`
   - 输出：`evidence`（events + summary）
   - 目标：events 覆盖多个 type（至少包含 `debug:event`）；summary 里包含 `runtime.services` 与（可选）`converge.staticIrByDigest` 用于跳转定位；并验证裁剪提示（maxEvents=1000）。

### 0.2 Schema 校验与降级

- 基础校验：按 JSON schema 校验（失败时仍允许以“原始 JSON”模式查看，但标红“非协议载荷”）。
- 版本兼容：对未知字段保持透传展示（不丢数据），但在“结构面板”里只渲染已知字段。

### 0.3 交互与复用约定（组件契约）

每个 POC 组件遵守同一套“嵌入契约”（平台侧可统一接入）：

- **输入**：`value`（协议 JSON）+ `mode`（view/diff）+ `budget`（只影响展示裁剪，不改原值）
- **输出事件**：
  - `onNavigate(ref)`：跨视图导航（例如从 Evidence timeline 跳 StaticIR digest）
  - `onCopy(payload)`：复制/导出动作（用于平台统一 toast/埋点）
- **可选能力**：
  - `onRequestRerun(options)`：只发“重跑意图”，由平台决定是否执行

建议统一的 `ref` 结构（平台侧可做 deep-link）：

```ts
type IrRef =
  | { kind: "manifest"; moduleId: string; digest?: string }
  | { kind: "staticIr"; moduleId: string; digest: string; nodeId?: string }
  | { kind: "trialRun"; runId: string }
  | { kind: "controlPlane"; instanceId: string; serviceId?: string }
  | { kind: "evidence"; runId: string; seq?: number; type?: string }
```

---

## P0（最高 ROI）: ModuleManifest Explorer + 版本 Diff/Breaking Guard

### 目标

- **结构面板**：把 `ModuleManifest` 变成“可读的模块名片”（给 Studio/Agent/人类读）。
- **Diff/Breaking**：把“CI Contract Guard”做成同一套 diff 结果的可视化，保证规则一致。

### 输入

- `ModuleManifest`（单份）或 `before/after ModuleManifest`（两份）。
- 或 CI/Contract Guard 产出的 `ModuleManifestDiff`（`contracts/schemas/module-manifest-diff.schema.json`），用于直接渲染变更列表与解释。

### 展现形式（小而美）

1. **Header（名片）**
   - `moduleId` + `digest` + `manifestVersion`
   - badges：`schemaKeys` 数量、`actionKeys` 数量、`logicUnits` 数量、是否包含 `staticIr`
2. **Sections（结构面板）**
   - Actions：列表 + 搜索 + 一键复制 key
   - Schemas：schemaKeys 列表 + 搜索 + 一键复制
   - Logic Units：按 `kind` 分组，展示 `id/name/derived`
   - Source/Meta：source 定位（file:line:column）+ meta 作为可折叠 JSON
3. **Diff 模式（可切换）**
   - 左右两列（before/after）+ 中间“变更列表”
   - 变更列表按严重级别：`BREAKING` / `RISKY` / `INFO`

### 交互

- 快速筛选：`/` 聚焦搜索框，输入关键字过滤 action/schema/logicUnits。
- 点击某项 → 右侧 detail：显示来源字段路径（JSON Pointer）、原始值片段、复制按钮。
- Diff 里点击某条变更 → 高亮对应 before/after 区块。
- 导出：`Download diff.json` / `Copy markdown summary`。

### Breaking 检测（最小规则集，先落地）

> 规则必须可被 CI 复用（同一份规则输出结构化结果）。

- BREAKING：
  - `actionKeys` 删除
  - `schemaKeys` 删除
  - `logicUnits` 的 `id/kind` 删除或 `kind` 变更
- RISKY：
  - `meta` key 删除或关键字段变化（可配置 allowlist）
  - `source` 变化（提示“位置漂移”，不算 breaking）
- INFO：
  - digest 变化但结构项未变化（提示“可能是排序/注释/无关字段导致”）

### 平台侧复用方式

- 平台只需提供：两份 manifest 或一份由 CI 产生的 diff 结果；UI 负责渲染与解释。

---

## P1: StaticIR（StateTrait）DAG 可视化（computed/link/source/check）

### 目标

- 把 `StaticIR` 的 nodes/edges 渲染成可交互的“推导关系图”，用于：
  - explainability（为什么一个字段变化会影响另一个）
  - 结构冲突定位（cycle/multi-writer）
  - digest 对齐与漂移检测

### 输入

- `StaticIR`（`specs/025-*/contracts/schemas/static-ir.schema.json`）

### 展现形式（小而美）

1. **Header**
   - `moduleId` + `digest` + `version`
   - badges：nodes/edges 数量、conflicts 数量（若有）
2. **Graph + Detail（两栏）**
   - 左：DAG 画布（简化节点样式，按 kind 上色）
   - 右：选中节点详情
     - `kind`
     - `reads[]`（输入字段）
     - `writes[]`（输出字段）
     - `writesUnknown`（若 true，提示“写集合不完整，影响精确 diff/HMR”）
     - `meta.label/description/tags/group/docsUrl`
3. **Conflicts 面板（可折叠）**
   - 列出冲突条目（cycle/multi-writer 等的结构化 payload），并提供“建议动作”（不写代码，只写方向）

### 交互

- 搜索字段：输入 field path → 高亮所有读/写该字段的节点与边。
- 点击节点：高亮 inbound/outbound，右侧显示 reads/writes 并支持一键复制。
- 传递依赖（Transitive）高亮：
  - **Impact 模式**：选中一个 field 或 node，沿 `edges` 计算所有下游可达节点/字段（“修改 A 最终会影响哪些下游字段”）。
  - **Dependency 模式**：反向沿 `edges` 计算所有上游依赖（“B 依赖哪些输入链路”）。
  - UI 呈现：高亮子图 + 计数（受影响节点数/字段数）+ 支持一键导出影响清单（fields list）。
- Filter：按 kind 过滤（computed/link/source/check），或仅看与某字段相关的子图。
- 导出：`Download static-ir.json` / `Copy dot/mermaid`（可选，便于文档/讨论）。

### 平台侧复用方式

- 输入只需要 static-ir JSON；图布局可由平台替换（POC 先用最简单的 layout）。

---

## P2: TrialRunReport Preflight（预检报告 + 一键重跑）

### 目标

- 把 `TrialRunReport` 做成“部署/合规/运行前预检”面板：
  - 缺失依赖一眼看懂
  - 失败分类可行动
  - 支持“重跑意图”（平台接入后可一键重跑）

### 输入

- `TrialRunReport`（包含 `environment` / 可选 `manifest/staticIr/evidence/summary/error`）

### 展现形式（小而美）

1. **Header（结论）**
   - `ok`（绿/红）+ `runId`
   - 若失败：展示 `error` 的最小摘要（类别/消息/阶段）
2. **Preflight Checklist（清单式）**
   - Missing Services（红色）：
     - `environment.missingServices[]`
   - Config Keys（灰色/黄色）：
     - `environment.configKeys[]`
   - TagIds（灰色）：
     - `environment.tagIds[]`
3. **Actionable Hints（建议动作）**
   - 每个 missing service 给出“修复方向”模板：提供对应 provider / Layer / mock（不落具体代码）。
4. **Links**
   - “打开 Manifest（P0）”
   - “打开 StaticIR（P1）”
   - “解释控制面覆写（P3）”（如果带 `runtimeServicesEvidence`）
   - “查看 Evidence timeline（P4）”（如果带 `evidence`）

### 交互

- Copy：`runId` / missingServices/configKeys 列表一键复制。
- Rerun：
  - POC 先做 `Generate rerun options JSON`（把 budgets/runId/source/buildEnv 组合成一段 JSON）
  - 平台接入后替换为真正的 `onRequestRerun(options)` 执行。
- Diff：同一 program module 的两次 report 对比（可选）：突出 missingServices/overridesApplied/manifest digest 的变化。

---

## P3: RuntimeServicesEvidence 控制面覆写解释器（为什么选了这个 impl）

### 目标

- 把 `RuntimeServicesEvidence` 变成“可解释的控制面面板”：
  - 解释每个 service 的最终选择来自哪个 scope
  - 解释哪些 override 生效、哪些被覆盖

### 输入

- `RuntimeServicesEvidence`（来自 `environment.runtimeServicesEvidence` 或 evidence.summary.runtime.services）

### 展现形式（小而美）

1. **Header**
   - `moduleId` / `instanceId` / `scope`
   - `overridesApplied[]`（可折叠）
2. **Bindings Table（核心）**
   - 列：`serviceId` / `scope` / `implId@implVersion` / `overridden` / `notes`
   - 默认按 `serviceId` 排序，支持搜索与按 scope 分组
3. **Per-Service Explain（点开一项）**
   - 同一 `serviceId` 的候选绑定（按 scope 优先级排序）
   - 标注“winner/overridden”的原因（以 evidence 字段为准，缺信息时显示 unknown）

> 注：如果未来需要“更完整的解释链路”（例如明确 fallback 原因、缺失候选绑定的路径），优先考虑通过 **额外 Evidence/Debug 事件**补齐，而不是把 UI 绑死在 runtime 内部对象图。POC 先以当前 schema（bindings + overridesApplied）做到“可用解释”，其余显示为 unknown 并留扩展点。

### 交互

- 搜索 serviceId；点击行进入详情；一键复制 serviceId/implId。
- 导出：`Copy markdown explanation`（便于 PR 评论/工单）。

---

## P4（次高）: Evidence Session Timeline（事件时间线 + IR digest 定位）

### 目标

- 把 `EvidencePackage.events[]` 做成“发生了什么”的可分享诊断入口：
  - 可搜索/过滤
  - 可定位到 converge/static ir digest 与控制面证据

### 输入

- `EvidencePackage`（TrialRunReport.evidence 或独立导入）
- 可选：`EvidencePackage.summary` 中的 `converge.staticIrByDigest` / `runtime.services`

### 展现形式（小而美）

1. **Header**
   - `runId` / `source.host/label` / `createdAt`
   - events 数量 + 裁剪提示（默认 `maxEvents=1000`；如果被裁剪应显式提示）
2. **Timeline List**
   - 每行：`seq` / `timestamp` / `type` / payload 摘要（可折叠）
   - 支持“只看 debug:event / 只看某个前缀 type”
3. **Detail Drawer**
   - 展示完整 payload（JSON viewer）
   - 若是 `debug:event`：提取并高亮 `instanceId/txnSeq/opSeq`（如果存在）
4. **IR References**
   - 如果 summary.converge.staticIrByDigest 存在：列出 digest 列表，点选跳转到 converge/static IR 视图（P1）
   - 如果 summary.runtime.services 存在：跳转到控制面解释器（P3）

### 交互

- 搜索：按 type / payload（浅层）搜索；按 seq 跳转；时间范围过滤。
- Pin：把关键事件钉住（用于分享/讨论）。
- Export：导出“裁剪后的 evidence”（只保留选中的事件 + summary），便于贴到 issue/PR。
- Budget：提供“请求更多/更少事件”的重跑意图（仅生成 rerun options JSON；平台接入后再执行）。

---

## 建议的交付策略（小步快跑）

1. 先做 P0（Manifest + diff/breaking），让 CI/Studio/Agent 立刻共享同一份结构与规则。
2. 再做 P2（TrialRunReport 预检），把“缺失依赖/违规分类/可行动”跑通。
3. 再补 P3（控制面解释器），解决“为什么选了这个 impl”的解释链路。
4. P1（StaticIR）与 P4（Timeline）作为“解释力增强”，按实际场景迭代图布局与事件裁剪策略。
