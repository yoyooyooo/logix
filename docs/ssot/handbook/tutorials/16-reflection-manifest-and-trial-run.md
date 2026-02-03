---
title: Reflection / Manifest / TrialRun：把 runtime 暴露给平台/CI 的方式 教程 · 剧本集
status: draft
version: 1
---

# Reflection / Manifest / TrialRun：把 runtime 暴露给平台/CI 的方式 教程 · 剧本集

> **定位**：这是 `docs/ssot/handbook/` 的“维护者教程/剧本集”（how-to），用于新成员上手、老成员回味：把 Logix 的 **反射（Reflection）/ Manifest IR / 受控试运行（TrialRun）/ Artifacts 槽位** 这一条“Loader Pattern”链路讲清楚——为什么需要它、它如何做到确定性与可解释、以及平台/CI/脚本应如何消费它。  
> **重要**：本文不是裁决来源；凡涉及 MUST/协议/边界的最终口径以 SSoT 为准（`docs/ssot/platform/**` 与 `docs/ssot/runtime/**`）。

---

## 0. 最短阅读路径（10–20 分钟先建立正确心智）

1. Runtime SSoT（权威口径）：`docs/ssot/runtime/logix-core/api/06-reflection-and-trial-run.md`
2. 025 的 quickstart（最小可跑闭环）：`specs/025-ir-reflection-loader/quickstart.md`
3. Node-only CLI（推荐入口）：`specs/085-logix-cli-node-only/quickstart.md`
4. 一键落盘脚本（legacy/迁移来源）：`scripts/ir/inspect-module.ts`
5. 最小平台消费者（/ir 页面）：`examples/logix-sandbox-mvp/src/ir/IrPage.tsx`
6. 从 /ir 反推全链路（分节导航）：`docs/ssot/runtime/logix-core/api/07-ir-pipeline-from-irpage.md`
7. Artifacts 扩展位（实现）：`packages/logix-core/src/internal/observability/artifacts/*`
8. Artifacts 首个用例（Form RulesManifest）：`packages/logix-form/src/internal/form/artifacts.ts`
9. CLI 跑道（规划与契约）：`specs/085-logix-cli-node-only/spec.md`

---

## 1. 心智模型：这不是“跑一个程序”，而是“把程序当成可加载资产”

当平台/CI/Agent 需要回答这些问题时：

- “这个模块暴露了哪些 action/schema/logic 单元？是不是删了一个 key（breaking）？”
- “这次变更是不是让声明式依赖图（Static IR）漂移了？”
- “构造/装配阶段到底依赖了哪些服务/配置？缺哪些？（能不能在部署前就拦住）”
- “某个 feature kit 的补充静态摘要（rules 清单、告警、约束）能不能被平台统一展示与 diff？”

你会发现：**读源码 AST** 并不能覆盖真实运行时语义（工厂函数/组合/trait 合并/条件分支会让 AST 与最终对象不等价）。  
所以 Logix 选择把“可被平台消费的事实源”下沉到 **模块对象（Module object）本身**：

> **Reflection**：只基于最终的 `Module` 对象提取结构摘要（Manifest IR）与 Static IR。  
> **Trial Run**：在 Build Env 中做一次“受控 boot + 观察窗口 + 强制收束”，提取 Environment IR、控制面证据与 artifacts。  
> **Artifacts**：给 feature kits 一个统一的 “补充静态 IR 摘要槽位”，避免每个 kit 各做一套 inspect API。

### 1.1 最小 IR 组合：对外只交付“可序列化、可 diff”的三件套

在 025/031 的口径下，平台/CI 的最小 IR（对外）可以压缩为：

1. `ModuleManifest`（结构摘要）——“它是什么”
2. `StaticIr`（声明式依赖图，canonical）——“它的静态推导关系是什么”
3. `TrialRunReport`（受控试跑摘要）——“它在受控启动时观测到了什么依赖/证据/告警”

其他信息（事件序列、kit-specific 摘要、控制面覆写）都必须能降解进这三者的组合：要么作为 `TrialRunReport` 的字段，要么作为 `artifacts` 的条目。

### 1.2 反射与试跑的“确定性”目标是什么

这里的“确定性/稳定 diff”不是玄学，它指向可执行的工程口径：

- **同输入**：同一份模块对象、同一份 BuildEnv 配置、同一套 budgets/超时/裁剪策略 → 输出 JSON 结构一致（排序稳定、字段可序列化）。
- **可降噪**：把“稳定身份与结构破坏”与“噪音字段（meta/source）”分层；典型策略：
  - `ModuleManifest.digest` **不包含** `meta/source`（减少 CI 噪音）。
  - `diffManifest` 将 `meta` 默认归类为 `RISKY`、`source` 默认归类为 `INFO`（避免误判 breaking）。
- **可解释**：失败必须结构化、可行动（MissingDependency / TrialRunTimeout / DisposeTimeout / Oversized / RuntimeFailure）。

### 1.3 标识模型：`runId` ≠ `instanceId` ≠ `moduleId`

这三个标识经常被混用，但它们在平台/CI 中承担不同职责：

- `moduleId`：模块身份（来自 module.tag/module.id），用于 diff 与索引。
- `runId`：**试跑会话**标识（用于 EvidencePackage、TrialRunReport），CI 场景必须显式提供，避免默认 `Date.now()` 造成不可对比。
- `instanceId`：runtime 实例标识（更贴近运行时多实例/多内核语义），不应被平台拿来替代 `runId`。

你要的不是“谁更重要”，而是“在什么场景依赖哪个标识”：CI/工件落盘与 diff 以 `moduleId + runId` 为主，运行时解释链路再引入 `instanceId/txnSeq/opSeq` 等动态维度。

---

## 2. 核心链路（从 0 到 1）：Module → Manifest/StaticIR → TrialRunReport → Artifacts

本节按“最小闭环”从输入到输出讲一遍，你可以把它当作平台/CLI 的参考实现蓝图。

### 2.1 输入：最终模块对象（不读 AST）

所有链路都以“最终模块对象”为输入：

- `AnyModule`（对外抽象）或 `ModuleImpl`（实现体）
- 通常来自一个 program module export，例如 `export const AppRoot = ...`

关键点：**不要在平台侧要求用户提供源码/AST**，只要求提供“可 import 的入口导出”。

### 2.2 Reflection：提取 `ModuleManifest`（结构摘要）

入口：`packages/logix-core/src/Reflection.ts`（对外 API）

- `Logix.Reflection.extractManifest(module, options?)`
  - 输出：`ModuleManifest`（JSON 可序列化）
  - 确定性：`actionKeys/schemaKeys/...` 排序稳定
  - `digest`：只由结构字段决定（不含 `meta/source/staticIr` 本体），但会包含 `staticIr.digest`（作为“静态依赖漂移”的信号）

实现：`packages/logix-core/src/internal/reflection/manifest.ts`

你在 CI 最常见的用法是：直接落盘 manifest JSON，后续按 `digest` 或按 diff 结果做 gate。

### 2.3 diff：`diffManifest(before, after)` 统一 CI 与 UI 口径

入口：`Logix.Reflection.diffManifest(before, after, options?)`  
实现：`packages/logix-core/src/internal/reflection/diff.ts`

diff 的价值在于“把不可门禁化的文本 diff”变成“可门禁化的变化摘要”：

- 输出 `ModuleManifestDiff`：
  - `verdict: PASS | WARN | FAIL`
  - `changes[]`：稳定排序（同输入必得同序）
  - `severity: BREAKING | RISKY | INFO`
- 典型策略：
  - `actionKeys/schemaKeys` 删除 → `BREAKING`
  - `staticIr.digest` 变化 → `RISKY`
  - `meta` 变化 → 默认 `RISKY`（可用 `metaAllowlist` 降噪）
  - `source` 变化 → `INFO`

> 直觉：CI gate 应依赖 `verdict + changes[].code`，而不是依赖“人肉读 diff”。

### 2.4 Trial Run：受控 boot，不执行 main，只做“观察窗口 + 强制收束”

入口：`Logix.Observability.trialRunModule(module, options?)`  
实现：`packages/logix-core/src/internal/observability/trialRunModule.ts`

它做的事情可以拆成 6 步：

1. 创建 `RunSession`（生成/注入 `runId`，并隔离 per-session local state）：`packages/logix-core/src/internal/observability/runSession.ts`
2. 安装 `EvidenceCollector`（作为 DebugSink + convergeStaticIrCollector），收集 slim 事件序列与 summary：`packages/logix-core/src/internal/observability/evidenceCollector.ts`
3. 构造 Build Env Layer（RuntimeHost + ConfigProvider）：`packages/logix-core/src/internal/platform/BuildEnv.ts`
4. **boot 模块**：复用 ProgramRunner Kernel 的装配模型，但不执行业务 `main`（只 `runFork(rootImpl.module)`）：
   - ProgramRunner：`packages/logix-core/src/internal/runtime/ProgramRunner.kernel.ts`
5. 两段超时：
   - `trialRunTimeoutMs`：观察窗口超时 → 归因 `TrialRunTimeout`
   - `closeScopeTimeout`：释放收束超时 → 归因 `DisposeTimeout`
6. 导出 `TrialRunReport`（尽可能包含 manifest/staticIr/artifacts/evidence；失败时仍尽力携带可解释信息）

为什么强调“两段超时”？因为它们指向不同的修复动作：

- `TrialRunTimeout`：通常是装配阶段阻塞（`Effect.never`、未完成 acquire、死等 IO/锁）
- `DisposeTimeout`：通常是资源未释放（dangling fiber、listener 未取消、handle 未 close）

### 2.5 Environment IR：依赖观测摘要（best-effort）+ 缺失清单（hard fail）

`TrialRunReport.environment` 的核心字段：

- `tagIds`：试跑期间观测到的 service ids（含 missing）
- `configKeys`：提供过的 config keys（含 missing）
- `missingServices` / `missingConfigKeys`：缺失清单（用于可行动修复）
- `runtimeServicesEvidence`：控制面证据（可选；`diagnosticsLevel=off` 时不导出）
- `kernelImplementationRef`：内核实现引用（用于解释/对照）

缺失依赖策略：**缺失服务/配置必须失败**（`error.code = MissingDependency`），避免平台/CI 得到“看似可用但运行必炸”的假阳性。

### 2.6 Artifacts：统一的补充静态 IR 槽位（key → envelope）

Artifacts 的目标：让“kit-specific 的解释语义”能被平台/CLI/Devtools **统一导出、统一预算、统一失败口径**。

核心协议（实现）：

- 模型：`packages/logix-core/src/internal/observability/artifacts/model.ts`
  - `ArtifactKey`：`^@[^\\s/]+\\/[^\\s@]+@v\\d+$`（稳定且版本化）
  - `ArtifactEnvelope`：`{ ok, value|error, digest, truncated?, budgetBytes?, actualBytes? }`
- 导出者接口：`packages/logix-core/src/internal/observability/artifacts/exporter.ts`
  - `TrialRunArtifactExporter`：`{ exporterId, artifactKey, export(ctx) }`
- 注册/读取：
  - `Logix.Observability.registerTrialRunArtifactExporter(moduleTag, exporter)`
  - `getTrialRunArtifactExporters(tag)`（内部）
- 收集器（预算/截断/冲突/单项失败不阻塞）：`packages/logix-core/src/internal/observability/artifacts/collect.ts`
  - 默认 **每个 artifact 50KB**（可配置）
  - 超预算不直接失败：会输出 `_tag: 'oversized'` 预览值，并置 `truncated=true`（保留 digest，便于“知道变了什么但不把 CI 打爆”）
  - key 冲突会变成 `ArtifactKeyConflict` 错误 envelope（同时仍导出其它 artifacts）

> 关键裁决：artifacts 的 “key 命名空间”表达的是**概念域/契约域**，不是实现包路径；消费者不得据此推断 import 路径。

### 2.7 Report-level budgets：超限时的“可解释降级”

`TrialRunReport` 支持 `budgets.maxBytes`（整体最大 JSON bytes）。当 report 超预算时，会降级为：

- `ok: false`
- `error.code: Oversized`
- `summary.__logix.truncated=true` + `dropped: ['manifest','staticIr','artifacts','evidence']`

这不是“偷懒丢数据”，而是强制把“预算”变成可交接事实：平台/CI 必须在“跑得动”和“信息密度”之间做显式取舍。

---

## 3. 剧本集（用例驱动）

### 3.1 本地一键 inspect（推荐入口）

如果你只想快速得到“可落盘、可对比”的工件，优先用 Node-only CLI（085，强制要求 `--runId`）：

见：`specs/085-logix-cli-node-only/quickstart.md`

它会落盘（示例）：

- `control-surface.manifest.json`
- `trialrun.report.json`

并配套 Gate：

- `ir validate`（门禁）
- `ir diff`（与基线目录稳定对比）

> legacy：`scripts/ir/inspect-module.ts` 仍保留作为迁移来源/底层参考（输出文件名与 CLI 不同：`module-manifest.json`、`trial-run-report.json`），不建议作为长期入口继续扩展。

### 3.2 CI 契约防腐：把“破坏性变更”前移到 PR

你可以把 CI gate 拆成两层（从快到慢）：

1. **Manifest diff gate（快）**：对比 `ModuleManifest`（结构破坏/静态依赖漂移）
2. **TrialRun gate（慢）**：用受控试跑提前暴露缺失依赖、scope dispose 问题、artifacts 冲突等

典型策略：

- `diff.verdict === FAIL`（BREAKING）直接失败；
- `WARN`（RISKY）按 allowlist 决策（例如 meta 的少量变化）；
- TrialRun 如果 `error.code === MissingDependency` 直接失败（必须可行动修复）。

### 3.3 平台侧 /ir：把“证据链”变成可浏览的 UI

最小平台消费者：`examples/logix-sandbox-mvp/src/ir/IrPage.tsx`

它的价值不在“做一个漂亮页面”，而在于把平台未来必需的面板先固化为心智模型：

- Manifest（结构摘要）
- Static IR（依赖图）
- TrialRunReport（environment + evidence + error）
- Artifacts（kit-specific 摘要与 warnings）

如果你要排查“为什么平台导出的东西和 CI 不一致”，优先从 `/ir` 的链路反推（它就是平台最小闭环的原型）。

### 3.4 MissingDependency（缺失服务）：不是告警，而是硬失败

你在 TrialRunReport 里会看到：

- `error.code = MissingDependency`
- `environment.missingServices` 非空

修复路径只有两条（必须显式选一种）：

1. 在 TrialRun 的 `options.layer` 注入 mock/impl（适合 CI/平台预检）
2. 把依赖访问从 build/装配阶段挪到 runtime（例如 trait handler / logic run section）

不要做的事：把缺失依赖当成 warnings 放行（那会把失败推迟到真实运行期，且诊断链路更难解释）。

### 3.5 MissingDependency（缺失配置）：BuildEnv.configKeys 是你可交接的“部署前置”

当 `missingConfigKeys` 非空时，说明你的模块在装配阶段读取了 Config，但 BuildEnv 没提供。  
修复方式同样必须显式：

- 在 `buildEnv.config` 里提供 key；
- 或在 Config 侧加 default（把它从“部署要求”降级为“可选能力”）。

### 3.6 TrialRunTimeout：装配阶段卡住了（通常不是“业务逻辑太慢”）

`TrialRunTimeout` 更像“loader 把你拦在门口”：它常见的根因是：

- 某个 Layer acquire 永远不返回（`Effect.never`）
- 在构造/装配期做了不该做的 IO（等待网络/文件/锁）
- 构造期循环依赖导致死等

建议排查顺序：

1. 先把 `diagnosticsLevel` 调到 `light/full`，看 Evidence timeline 的最后一个事件停在哪里；
2. 逐步把 layer 拆开：先空 layer 能不能试跑；再逐项加回；
3. 如果某个 service 初始化必须做 IO，把它挪到 runtime（启动后）并加可解释的错误策略。

### 3.7 DisposeTimeout：不是“关不掉”，而是“你没告诉 runtime 怎么关”

`DisposeTimeout` 的典型根因：

- 常驻 fiber 没被 scope 管理（或 finalizer 没注册）
- 注册了事件监听但没卸载
- 外部资源（socket/file handle）没关闭

修复原则：**所有常驻任务必须被 scope 管起来**，并且在 close 时可中断/可收束。

相关教程：`docs/ssot/handbook/tutorials/12-process-and-scheduling.md`（长期进程与收束模型）

### 3.8 Oversized：预算不是“限制”，而是“平台可用性”的一部分

当 `TrialRunReport` 超过 `budgets.maxBytes`，report 会进入可解释降级（见 2.7）。  
此时你应该优先做的是“选择信息密度”，而不是“关掉预算”：

- `maxEvents` 调小（事件序列最容易爆）
- artifacts 单项体积过大：让 exporter 输出摘要而不是全量
- manifest/staticIr 过大：回到“平台需要的最小字段集合”重新裁剪（必要时拆工件）

### 3.9 Artifacts 首个用例：`@logixjs/form.rulesManifest@v1`

实现：`packages/logix-form/src/internal/form/artifacts.ts`

- `artifactKey = '@logixjs/form.rulesManifest@v1'`
- payload：`{ manifest, warnings }`

这条 artifact 的价值是：它把“rules 的解释语义”从纯 runtime 内核里抽出来，变成平台/CI 可以读的补充静态摘要。

典型平台用法：

- `/ir` 页面直接展示 manifest + warnings；
- CI 可以对 `artifact.digest` 做粗粒度变更检测；
- 当 warnings 新增时（例如 identity 缺失），平台可以把它作为“可行动修复建议”展示。

### 3.10 如何给一个 kit 新增 artifact（OCP 扩展点）

你要做的只有三步：

1. 选一个稳定且版本化的 key：`@scope/name@v1`
2. 实现一个 exporter：`TrialRunArtifactExporter`
3. 在 module tag 上注册 exporter：`Logix.Observability.registerTrialRunArtifactExporter(tag, exporter)`

关键注意点：

- exporter 的 `export()` 必须返回 `JsonValue`（不可序列化会被标记为错误 envelope）
- 不要输出时间戳/随机数/机器特异信息（会破坏可对比性）
- 把“大对象”做成摘要（预算默认每项 50KB）

### 3.11 key 冲突：系统必须失败（但不该吞掉其它 artifacts）

冲突用例测试：`packages/logix-core/test/TrialRunArtifacts/Artifacts.conflict.test.ts`

冲突时：

- 冲突 key 会产生 `ok:false` 的错误 envelope，`error.code = ArtifactKeyConflict`
- 其它不冲突的 artifacts 仍会导出

这条语义的价值是：平台可以同时看到“哪里冲突”与“其它已成功的证据”，避免“一处坏了全盘不可用”。

---

## 4. 代码锚点（Code Anchors）

### 4.1 对外 API（@logixjs/core）

- `packages/logix-core/src/Reflection.ts`：`extractManifest/exportStaticIr/diffManifest`
- `packages/logix-core/src/Observability.ts`：`trialRunModule`（re-export）、`registerTrialRunArtifactExporter`、JsonValue/Artifacts types

### 4.2 Reflection 实现（不读 AST）

- `packages/logix-core/src/internal/reflection/manifest.ts`：`ModuleManifest` 结构与 `digest` 口径
- `packages/logix-core/src/internal/reflection/diff.ts`：`ModuleManifestDiff`（verdict + changes[] 稳定排序）
- `packages/logix-core/src/internal/reflection/staticIr.ts`：`exportStaticIr`

### 4.3 Trial Run / Evidence / RunSession

- `packages/logix-core/src/internal/observability/trialRunModule.ts`：TrialRunReport、EnvironmentIr、两段超时、MissingDependency 解析、Oversized 降级
- `packages/logix-core/src/internal/observability/trialRun.ts`：通用 `trialRun(program)`（Scope.make/close + EvidencePackage）
- `packages/logix-core/src/internal/observability/runSession.ts`：`runId`、per-session `once/nextSeq`
- `packages/logix-core/src/internal/platform/BuildEnv.ts`：BuildEnv layer（RuntimeHost + ConfigProvider）
- `packages/logix-core/src/internal/platform/ConstructionGuard.ts`：构建态缺失 service 的可行动错误

### 4.4 Artifacts 槽位

- `packages/logix-core/src/internal/observability/artifacts/model.ts`：ArtifactKey/Envelope/TrialRunArtifacts
- `packages/logix-core/src/internal/observability/artifacts/exporter.ts`：Exporter 接口
- `packages/logix-core/src/internal/observability/artifacts/registry.ts`：module tag 注册/读取
- `packages/logix-core/src/internal/observability/artifacts/collect.ts`：预算/截断/冲突/失败语义

### 4.5 首个用例与最小平台

- `packages/logix-form/src/internal/form/artifacts.ts`：RulesManifest artifact exporter
- `specs/085-logix-cli-node-only/quickstart.md`：Node-only CLI（`ir export`/`trialrun`/`ir validate`/`ir diff`）
- `scripts/ir/inspect-module.ts`：legacy 脚本（迁移来源/底层参考）
- `examples/logix-sandbox-mvp/src/ir/IrPage.tsx`：/ir 页面（平台最小消费者）

---

## 5. 验证方式（Evidence）

### 5.1 生成工件（推荐）

按 085 quickstart 跑一次（会落盘 `control-surface.manifest.json` 与 `trialrun.report.json`）：

- `specs/085-logix-cli-node-only/quickstart.md`

legacy（仍可用，但不建议作为长期入口扩展）：

- `specs/025-ir-reflection-loader/quickstart.md`

### 5.2 核心测试（不进入 watch）

建议最小验证集合（按需选）：

- `pnpm --filter @logixjs/core test`
- `pnpm --filter @logixjs/form test`

其中 `@logixjs/core` 的相关用例可以从这些目录下钻：

- `packages/logix-core/test/observability/*`（runId/timeout/dispose/missing deps 等）
- `packages/logix-core/test/TrialRunArtifacts/*`（artifacts registry/budget/conflict 等）

---

## 6. 常见坑（Anti-patterns）

1. **CI 里不传 `runId`**：默认 `runId` 会包含时间信息，导致工件不可对比；CI 必须显式提供稳定 runId。
2. **把 Trial Run 当成“业务正确性测试”**：Trial Run 的目标是“反射/预检/解释链路”，不是验证业务逻辑完成（它不会执行 main）。
3. **让 artifacts 输出非确定性字段**：时间戳/随机数/机器信息会直接破坏 diff 与长期存储。
4. **让 artifacts 输出全量大对象**：预算默认 50KB；超预算要输出摘要/预览并保留 digest，而不是关掉预算。
5. **缺失依赖当 warnings**：MissingDependency 必须失败（否则平台/CI 会把失败推迟到运行期且更难定位）。
6. **收束模型不清**：DisposeTimeout 往往意味着资源没被 scope 管住；先回到“谁创建、谁 close”的基本原则。
