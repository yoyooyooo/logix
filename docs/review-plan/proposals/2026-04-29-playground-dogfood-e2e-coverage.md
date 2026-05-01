# Playground Dogfood E2E Coverage Proposal

- date: 2026-04-29
- slug: playground-dogfood-e2e-coverage
- status: reviewed-draft

## Executive Summary

`examples/logix-react` 的 `/playground/:id` 路由需要升级为 Dogfooding 验收面。测试目标是证明每个 curated Demo 的可见能力都来自同一份 `ProjectSnapshot`、runtime evidence envelope、runtime reflection manifest、operation events、control-plane report 和 workbench projection。

这个验收面还要主动压出内核边界和 gap。E2E 不能只证明 happy path 可点击；它必须把缺失 evidence、能力不可用、projection 不一致、control-plane 缺口、transport/compile/runtime failure 显式归类到已有 evidence gap 或 control-plane output，避免 UI fallback 伪装成内核能力。

这个验收面还要证明 React host 的状态归属。Playground 现在存在 Shell 订阅过宽、父级 slot 重建导致局部交互扩散到无关区域 render/remount 的风险。Dogfooding coverage 必须同时验证 runtime truth alignment 与 render isolation：evidence coordinate 证明内核事实对齐，render isolation probe 证明 UI 区域拥有自身订阅边界。

本提案默认 `docs/superpowers/plans/2026-04-29-playground-runtime-evidence-refresh.md` 已经实施完毕。新工作只规划细粒度 Playwright 覆盖和必要测试支撑，不重开运行时证据刷新实现。

## Adopted Decision

采用 `registry-indexed proof recipes + facet-derived proof packs + evidence coordinate oracle + render isolation probes`。

含义：

- `logixReactPlaygroundRegistry` 是 project 集合、files、program、capabilities、drivers、scenarios、serviceFiles 与 pressure fixtures 的来源。
- 测试 support 只维护最小 proof recipe，形状固定为 `projectId + reportLabel + proofPackIds + assertDemoProof(ctx)`。
- route 从 `project.id` 派生为 `/playground/${project.id}`。
- files、program entry、capability、service group、driver、scenario、pressure tab、scroll owner、visible region 全部从 `PlaygroundProject` 或 fixture metadata 派生。
- 所有 runtime 对齐断言统一走 `assertEvidenceCoordinate`，比较同一个 `{ projectId, sourceRevision, sourceDigest, operationKind, operationId/opSeq }`。
- Pressure fixture 的大数据量只证明视觉容量。真实 runtime proof 由每个 pressure route 的轻量 `runtimeEvidenceProbe` 单独证明。
- 每个 proof pack 同时承担 gap harvest 责任：遇到缺失 authority、无法反射、无法运行、无法投影时，测试必须断言已有 runtime evidence gap/control-plane failure/transport failure 可见，并带 owner class。
- `renderIsolationProbe` 是同一 dogfooding 质量门的一部分，用 region commit/fanout 证明局部控件只影响 owning region 的订阅与渲染边界。
- SSoT 只沉淀 Dogfooding route proof law。可执行矩阵留在测试 support，verification note 只记录命令、case count、proof map 路径和结果。

## Problem

- 现有 `examples/logix-react/test/browser/playground-route-contract.playwright.ts` 已覆盖 shell、Monaco、部分 pressure fixture、默认 dispatch、driver、scenario、Run、Trial 和项目切换。
- 当前覆盖偏向 UI smoke 与布局压力，缺少“每个 Demo 表面能力对应哪段内核链路”的机器可检查 contract。
- `logix-react.service-source` 只通过 project switcher 间接触达，缺少独立 route 的 service source edit to runtime output 闭环。
- Pressure routes 主要证明滚动、默认 tab 和压力数据可见，缺少 visual capacity 与 runtime authority 的分层。
- `PlaygroundShell` 一次性订阅过多 workbench state，并把 `HostCommandBar`、`FilesPanel`、`SourcePanel`、`RuntimeInspector`、`WorkbenchBottomPanel` 作为父级创建的 ReactNode slot 传入 layout。Inspector tab、bottom tab、file selection、Run/Check/Trial/Reset 等局部变化会先触发 Shell render，再重建多个无关区域。
- 后续新增 Demo 时，测试容易遗漏，因为 Playwright route list 和 `logixReactPlaygroundRegistry` 之间没有 exact coverage gate。

影响对象：

- Playground 维护者无法从一次 E2E 运行判断所有 curated Demo 是否仍和内核链路一致。
- Agent 修复 Playground 行为时，缺少细粒度失败位置，只能看到泛化 shell 或 layout 失败。
- 文档读者打开稳定 route 时可能看到可点击控件，但控件背后的 evidence authority 已经漂移。

## Baseline Assumption

本提案以这些事实为已完成前提：

- Playground 内部已有 `PlaygroundRuntimeEvidenceEnvelope` 或等价 evidence root。
- `reflect`、`run`、`dispatch`、`check`、`trialStartup` 都返回 runtime-backed evidence envelope。
- Action panel、Driver panel、Raw Dispatch 都消费 runtime-backed manifest action tags。
- Source regex 不能作为 product path action authority。
- Trace 由 runtime operation events 和 evidence gaps 派生。
- Check/Trial report、reflection artifact refs、source digest 已能进入 workbench projection。

若实施时发现这些前提未满足，本提案不扩展范围补运行时实现；应先完成 `playground-runtime-evidence-refresh` 前置缺口。

## Bound Sources

- Product SSoT: `docs/ssot/runtime/17-playground-product-workbench.md`
- Runtime evidence review ledger: `docs/review-plan/runs/2026-04-29-playground-runtime-reflection-gap.md`
- Runtime evidence implementation plan: `docs/superpowers/plans/2026-04-29-playground-runtime-evidence-refresh.md`
- Registry: `examples/logix-react/src/playground/registry.ts`
- Current Playwright runner: `examples/logix-react/test/browser/playground-route-contract.playwright.ts`

## Goal Function

一次 `pnpm -C examples/logix-react test:browser:playground` 应能回答：

1. 每个 `logixReactPlaygroundRegistry` project 都有可打开、可读、可运行、可诊断的 `/playground/:id` route。
2. 每个 Demo 的 visible affordance 都能追溯到它声明要演示的内核链路。
3. Action、Driver、Scenario、Run、Check、Trial、Trace、Snapshot 的输出共享同一个 evidence coordinate。
4. Pressure Demo 同时证明视觉容量和一条轻量 runtime evidence path，且不会把 mock pressure rows 当成 runtime authority。
5. 当 Playground 暴露内核边界或 gap 时，页面必须显示可归因 evidence gap 或 control-plane/transport failure，而不是继续显示伪可用 affordance。
6. Inspector tab、bottom tab、file selection、Run/Check/Trial/Reset 的 render fanout 能证明 state ownership 已下沉到 owning region。
7. 新增 Demo 时，registry coverage gate 会要求补 proof recipe。

## Canonical Proof Contract

### Layer 1: All-route Invariants

每个 registry project 都自动执行：

- route 从 project id 派生，访问 `/playground/${project.id}` 后 URL 保持稳定。
- top command bar、project switcher、file navigator、source editor、runtime inspector、bottom drawer 可见。
- project switcher label 去掉 `logix-react.` prefix。
- file navigator 展示 `project.files` 的派生文件，不在 proof recipe 复制 required files。
- active file 优先等于 `project.program.entry`。
- Monaco editor 进入 ready 或 bounded fallback，TypeScript-family source 不出现 import-line squiggle。
- page body 无 overflow。
- route-level negative smoke 不出现 `[object Event]`、`fallback-source-regex`、`deriveFallbackActionManifestFromSnapshot`。
- Snapshot detail 展示 project id、revision、program entry、file count。

### Layer 2: Facet-derived Proof Packs

Proof pack 按 project metadata 自动启用，不要求不存在的 affordance。

| Pack | Trigger | Proof |
| --- | --- | --- |
| `run` | `project.capabilities.run` | 点击 Run 后 Result 显示 runtime output，并通过 `assertEvidenceCoordinate` 与 Trace/Snapshot 对齐 |
| `check` | `project.capabilities.check` | 点击 Check 后 Diagnostics 显示 control-plane report，并通过 `assertEvidenceCoordinate` 与 Diagnostics detail/Trace 对齐 |
| `trialStartup` | `project.capabilities.trialStartup` | 点击 Trial 后 Diagnostics 显示 startup report，并通过 `assertEvidenceCoordinate` 与 Diagnostics detail/Trace 对齐 |
| `actions` | runtime reflection manifest 有 actions | Action panel action tags 来自 runtime reflection manifest，按钮 dispatch 后 state、console、Trace 使用同一 coordinate |
| `drivers` | `project.drivers` 或 pressure-generated drivers 存在 | Driver actionTag 必须存在于 manifest；运行 driver 后 state、console、Trace 使用同一 coordinate |
| `scenarios` | `project.scenarios` 或 pressure-generated scenarios 存在 | Scenario driver step 通过 driver dispatch，Scenario detail、session state、Trace 使用同一 coordinate |
| `serviceFiles` | `project.serviceFiles` 存在 | service group 从 metadata 派生；编辑 service source 后 Run output 和 Snapshot changedFiles 使用同一 revision/sourceDigest |
| `pressureVisualCapacity` | `fixtures.pressure` 存在 | active tabs、required visible regions、scroll owners、row counts 从 pressure metadata 派生，仅证明视觉容量 |
| `runtimeEvidenceProbe` | 所有 project | 每个 route 至少运行一条轻量 operation，证明可见 result/diagnostics/trace/snapshot 引用同一 evidence coordinate |
| `gapHarvest` | 所有 project | 对缺失 manifest、unavailable capability、transport failure、compile/runtime failure、projection gap 做 owning-region 可见性和 owner class 断言；没有 gap 时断言无 silent fallback |
| `boundaryProbe` | selected routes | 主动触发代表性边界条件，确认它们进入已有 evidence gap/control-plane/transport/projection face |
| `renderIsolationProbe` | selected routes | 点击局部控件并统计 `data-playground-region` commit/remount fanout，证明 Shell 不替无关区域持有展示态订阅 |

### Layer 3: Demo-specific Proof Recipes

测试 support 维护 exact record。record keys 必须等于 `logixReactPlaygroundRegistry.map((project) => project.id)`。

允许字段：

```ts
interface PlaygroundRouteProofRecipe {
  readonly projectId: string
  readonly reportLabel: string
  readonly proofPackIds: ReadonlyArray<ProofPackId>
  readonly assertDemoProof?: (ctx: PlaygroundProofContext) => Promise<void>
}
```

禁止字段：

- `route`
- `requiredFiles`
- `expectedInitialTabs`
- `requiredRegions`
- `runtimeChecks`
- `visualPressureChecks`

这些字段都从 project declaration 或 fixture metadata 派生。

Demo recipes：

| Project | Report label | Required packs | Demo-specific proof |
| --- | --- | --- | --- |
| `logix-react.local-counter` | `local-counter runtime chain` | `run`, `check`, `trialStartup`, `actions`, `drivers`, `scenarios`, `runtimeEvidenceProbe`, `gapHarvest`, `renderIsolationProbe` | `increment` action、`Increase` driver、`Counter demo` scenario 共享 state 和 coordinate；编辑 `counterStep` 后 Run 与 dispatch 结果更新；Inspector tab、bottom tab、file selection、Run/Check/Trial/Reset 的 render fanout 不扩散到无关区域 |
| `logix-react.service-source` | `service source runtime chain` | `run`, `check`, `trialStartup`, `serviceFiles`, `runtimeEvidenceProbe`, `gapHarvest` | 编辑 `search.service.ts` 返回两条结果后 Run 输出 `resultCount: 2`，Snapshot changedFiles 包含 service file |
| `logix-react.pressure.action-dense` | `action density visual capacity` | `actions`, `pressureVisualCapacity`, `runtimeEvidenceProbe`, `gapHarvest`, `renderIsolationProbe` | action count 和 action search/filter 证明 action lane 承载；action lane 局部交互不重建 source/file/bottom regions |
| `logix-react.pressure.state-large` | `state projection visual capacity` | `pressureVisualCapacity`, `runtimeEvidenceProbe`, `gapHarvest` | state tree row count 与 state region scroll owner 来自 pressure metadata |
| `logix-react.pressure.trace-heavy` | `trace drawer visual capacity` | `pressureVisualCapacity`, `runtimeEvidenceProbe`, `gapHarvest`, `renderIsolationProbe` | 1200 pressure rows 只证明 Trace drawer 容量；真实 operation event 由 probe 单独断言；bottom tab 切换只影响 evidence drawer owning region |
| `logix-react.pressure.diagnostics-dense` | `diagnostics visual capacity` | `check`, `trialStartup`, `pressureVisualCapacity`, `runtimeEvidenceProbe`, `gapHarvest` | `LC-0001` 属于 pressure visual row；Check/Trial report 通过 coordinate 单独断言 |
| `logix-react.pressure.scenario-driver-payload` | `driver scenario payload visual capacity` | `drivers`, `scenarios`, `pressureVisualCapacity`, `runtimeEvidenceProbe`, `gapHarvest` | payload editor、driver list、scenario step list 自持滚动；运行 driver 后无重复 replay logs |

`local-counter` 与 `service-source` 的 packs 也隐含 `gapHarvest`。它们优先证明 happy path 闭环；当 happy path 失败时，失败面必须落到 evidence gap/control-plane/transport failure 的 owning region，测试失败信息带 owner class。

## Evidence Coordinate Oracle

新增测试谓词：

```ts
interface EvidenceCoordinate {
  readonly projectId: string
  readonly sourceRevision: string
  readonly sourceDigest: string
  readonly operationKind: string
  readonly operationId: string
}
```

规则：

- 每次 live operation 后，从 owning output region 读取 coordinate。
- Trace 中必须出现相同 `operationId` 的 accepted/completed 或 failed/gap 事件。
- Snapshot 或 evidence detail 必须显示相同 `sourceRevision` 与 `sourceDigest`。
- Check/Trial 的 Diagnostics detail 必须显示同一个 control-plane operation coordinate。
- Action、Driver、Scenario 不能只断言 state 文本；必须断言 state、console、Trace 至少两个面共享 coordinate。

若现有 UI 没有稳定文本承载 coordinate，允许给现有 evidence 输出补充语义 label 或 `data-playground-evidence-*` attribute。该 attribute 只暴露已存在的 runtime evidence projection，不新增产品概念。

## Kernel Gap Harvest Law

Playground 是内核 dogfooding 场景，不是展示层截图集。

规则：

- 每个 proof pack 都要在断言失败信息中保留 owner class：`reflection`、`runtime-run`、`runtime-dispatch`、`control-plane-check`、`control-plane-trial`、`transport`、`projection`、`playground-product`。
- 若 action manifest、driver actionTag、scenario step、service source、Run、Check、Trial 或 Trace 缺失 authority，UI 必须显示 evidence gap 或 unavailable state，不能继续显示可运行控件。
- 若 compile/transport/runtime failure 出现，Route E2E 必须证明它进入 bounded failure face，不能被吞成空结果、空 trace 或成功状态。
- 若 workbench projection 无法把 output 归入 session/finding/artifact/gap/drilldown ref，测试必须失败，并指向 `projection` owner class。
- 若某个 gap 暴露的是内核契约缺口，实施者应在 verification note 中记录 gap owner、触发 route、触发 operation 和后续提案路径。不要在 route test 中临时伪造成功。

## React Host Render Isolation Law

Playground dogfood proof must cover both runtime evidence alignment and React host render isolation. Local UI controls must not force unrelated workbench regions to re-render or remount; evidence coordinates prove runtime truth alignment, while render isolation probes prove state ownership and subscription boundaries.

规则：

- `PlaygroundShell` 只能保留 workspace bridge、runtime invoker/session runner、effects、command callbacks 和必要 refs；展示态订阅必须下沉到 owning region container。
- `ResizableWorkbench` 接收稳定区域组件或容器，不接收由 Shell 每次 render 重建的全量展示 slot。
- `RuntimeInspector` 的 active tab、advanced dispatch、selected driver/scenario、driver execution、scenario execution 要拆成细粒度 state 或 selector，避免 tab 切换刷新执行态订阅者。
- Bottom drawer 的 tab bar 只订阅 `bottomTab`，active body 才订阅 Console、Trace、Snapshot、Diagnostics 或 Scenario 所需数据。
- 文件选择只允许影响 file navigator active marker 与 source editor active model，不应 remount Inspector、bottom drawer 或 command bar。
- Run/Check/Trial 可以影响 command status、result、diagnostics、trace、snapshot 与 evidence regions，不应 remount Files panel 或 Source editor。
- Reset 可以重建 session/result/evidence owning regions，不应影响 layout/static regions。
- 测试断言区域 fanout，不要求严格零 commit；React StrictMode、Profiler callback 和异步 evidence 可以造成 bounded extra commit，但 remount 与无关区域 fanout 必须被捕获。
- 由该 law 暴露的 core 改进，例如显式 selector API、nested dirty evidence、broad subscription 诊断或 render fanout 证据工具，单独进入后续 SSoT/设计，不并入本 E2E coverage plan。

## Active Boundary Probe Contract

`gapHarvest` 负责全路由 no silent fallback。`boundaryProbe` 负责主动压边界。

主动探针只允许使用现有 UI 或 Playwright test harness，不新增 runtime API，不新增独立 gap taxonomy。`ownerClass` 只用于测试失败归属，必须映射到已有 evidence gap、control-plane failure、transport failure 或 workbench projection gap。

| Owner class | Route | Trigger | Expected existing face |
| --- | --- | --- | --- |
| `reflection` | `logix-react.local-counter` | 通过 Raw Dispatch 输入未知 `_tag`，例如 `missingAction` | Raw Dispatch owning region 显示 manifest validation failure 或 evidence gap；不调用 runtime dispatch；Trace 无 accepted/completed |
| `runtime-run` | `logix-react.local-counter` | 编辑 `/src/logic/localCounter.logic.ts` 为可编译但 runtime 抛错的 `counterStep` 计算，再点击 Run | Program result 显示 runtime failure face；Trace 有 failed event；Snapshot revision/sourceDigest 指向编辑后快照 |
| `runtime-dispatch` | `logix-react.local-counter` | 编辑 `/src/main.program.ts` 中 `increment` reducer 为可编译但 dispatch 时抛错，再点击 manifest-valid `Dispatch increment` | Action workbench 或 Console 显示 dispatch failed；Trace 有 failed event；previous state preserved；Snapshot revision/sourceDigest 指向编辑后快照 |
| `control-plane-check` | `logix-react.local-counter` | 编辑 source 造成类型或 schema 装配错误，再点击 Check | Diagnostics detail 显示 check failure 或 evidence gap；Run result 不被写成成功 |
| `control-plane-trial` | `logix-react.local-counter` | 同一错误快照点击 Trial | Diagnostics detail 显示 startup failure 或 evidence gap；Trial coordinate 与 Snapshot revision/sourceDigest 对齐 |
| `transport` | `logix-react.pressure.trace-heavy` | Playwright route 或 worker transport test hook 注入一次 sandbox transport failure，再触发 lightweight Run | owning result/trace face 显示 transport failure；页面 shell 不崩溃；无空成功态 |
| `projection` | `logix-react.pressure.diagnostics-dense` | 使用已有 projection gap 输出或 test hook 暴露 malformed projection input | Trace/Diagnostics/Snapshot 显示 projection gap；不把 gap rows 伪装成 control-plane PASS |
| `playground-product` | `logix-react.service-source` | 编辑 `search.service.ts` 为语义合法但返回非预期 shape，再 Run | Result 或 service source owning region 显示 bounded product/runtime failure；Snapshot changedFiles 保留服务文件 |

实施时如果某个 trigger 无法用现有 UI 或 test harness 稳定触发，允许替换为同 owner class 的更稳定触发方式，但必须保持 expected face 属于已有 authority。

## Options

### Option A: Expand Existing Single Playwright File

- Summary: 继续在 `playground-route-contract.playwright.ts` 内追加 helper 和矩阵。
- Pros: 改动小。
- Cons: 文件膨胀，proof data 和执行流程混杂。

### Option B: Thick Registry-indexed Proof Cases

- Summary: 新增 proof case 文件，但 case 持有 route、required files、regions、runtime checks 等字段。
- Pros: 可读性强。
- Cons: 形成第二套 project metadata，已被 reviewer 判定为劣势方案。

### Option C: One Playwright Spec Per Demo

- Summary: 每个 Demo 一个 Playwright 文件。
- Pros: 单文件短，可单独运行。
- Cons: 公共断言重复，server/browser 启动成本增加，registry coverage 还要额外聚合。

### Option D: Registry-indexed Recipes With Facet-derived Packs Recommended

- Summary: 单 Playwright runner，最小 proof recipe，metadata 从 registry/project/fixture 派生，runtime proof 统一走 evidence coordinate oracle。
- Pros: 概念数低，覆盖强，避免第二套 authority，新增 Demo 的失败信息明确。
- Cons: 初次需要拆 proof packs 和 coordinate helper。

### Option E: Fold Render Isolation Into Dogfood Quality Gate Adopted Addendum

- Summary: 在 Option D 上增加 `renderIsolationProbe`，并把 Playground region container 拆分放在 evidence coordinate wiring 之前。
- Pros: 同时覆盖内核事实对齐与 React host 订阅边界；能把 UI fanout 问题转成可回归的 dogfood 证据。
- Cons: 需要触达 `PlaygroundShell`、region components 和少量测试支撑，必须保护既有 `aria-label` 与 `data-playground-*` locator。

## Proposed Change

主要文件：

- `examples/logix-react/test/browser/playground-proof-recipes.ts`
  - 新增最小 proof recipe record。
  - 导出 `assertProofRecipeCoverage(registry, recipes)`。
- `examples/logix-react/test/browser/playground-proof-packs.ts`
  - 新增 all-route invariants、facet-derived packs、pressure visual capacity pack、runtime evidence probe pack。
- `examples/logix-react/test/browser/playground-evidence-coordinate.ts`
  - 新增 `readEvidenceCoordinate`、`assertEvidenceCoordinate`、Trace coordinate helpers。
- `examples/logix-react/test/browser/playground-gap-harvest.ts`
  - 新增 owner class 分类 helper。
  - 提供 `assertGapVisible`、`assertNoSilentFallback`、`formatGapFailure`。
- `examples/logix-react/test/browser/playground-boundary-probes.ts`
  - 新增主动边界探针。
  - 每个 probe 声明 `ownerClass`、`routeProjectId`、`trigger`、`expectedFace`。
  - 禁止定义新的 gap code 表。
- `examples/logix-react/test/browser/playground-render-isolation.ts`
  - 新增 region commit/remount 读取、fanout allowlist 和 `renderIsolationProbe` helper。
- `examples/logix-react/test/browser/playground-route-contract.playwright.ts`
  - 保留 Vite server + Chromium 入口。
  - 调用 proof recipes 和 proof packs。
  - 保留 bare route 和 project switcher 测试。
- `examples/logix-react/test/playground-registry.contract.test.ts`
  - 增加 registry id 与 proof recipe exact coverage。
- `packages/logix-playground/src/internal/components/**`
  - 仅当现有 output 无法稳定读取 evidence coordinate 时，补语义 label 或 `data-playground-evidence-*`。
  - 在 coordinate wiring 前先拆分 `PlaygroundShell` 的区域容器和展示态订阅边界，保留既有 `aria-label`、`data-playground-region`、`data-playground-section`、`data-playground-evidence-coordinate`。
- `packages/logix-playground/src/internal/state/workbenchProgram.ts`
  - 拆细 inspector/bottom/file selection state，避免单个粗对象造成 unrelated selector dirty。
- `docs/ssot/runtime/17-playground-product-workbench.md`
  - 只补 Dogfooding route proof law，禁止复制 Demo matrix。
- `specs/166-playground-driver-scenario-surface/notes/verification.md`
  - 只记录命令、case count、proof recipe 路径和验证结果。

高层算法：

1. `loadRegistryProjects()` 读取 registry。
2. `assertProofRecipeCoverage()` 检查 recipe keys 与 registry ids exact equal。
3. 每个 project 构造 `PlaygroundProofContext`：
   - project
   - route
   - derived files
   - derived capabilities
   - derived pressure metadata
   - browser page and baseUrl
   - gap owner classifier
4. 执行 all-route invariants。
5. 根据 project metadata 自动执行 facet proof packs。
6. 每个 pack 运行 `gapHarvest` postcheck：无 gap 时确认无 silent fallback；有 gap 时确认 owning region、owner class 和 evidence event 可见。
7. 执行 selected route 的 `renderIsolationProbe`，验证局部控件的 region fanout allowlist。
8. 执行 selected route 的 `boundaryProbe`，主动触发代表性边界并验证已有 failure face。
9. 执行 recipe 的 `assertDemoProof`。
10. 输出 `PASS <projectId> <packIds>`。

## Edge Cases

- Monaco completion 或 diagnostics 可能慢，测试要等待 editor engine ready 后再断言。
- Base UI select popup 要限定到 project switcher，不用全局 text selector。
- 重复按钮标签必须先限定 owning region，例如 `Runtime inspector` 或 `Workbench bottom console`。
- Pressure fixture mock rows 只证明 UI 承载，不能被当成 runtime authority。
- Run/Check/Trial 是 host command，测试必须确认它们不制造 action dispatch log。
- Source edit 会 restart session，测试要断言 revision/sourceDigest 变化和旧 output 清理。
- Gap harvest 不能吞掉失败。只有已进入 evidence gap/control-plane/transport failure 的 bounded failure 才算被正确归类；无法归类仍是测试失败。
- Boundary probe 不能为了通过测试制造产品成功态。它只能断言已有 failure face，或者记录真实内核 gap 并失败。
- Render isolation 测试必须保留既有 locator；允许新增锚点，删除或重命名 `aria-label`、`data-playground-region`、`data-playground-section`、`data-playground-evidence-coordinate` 必须同步 proposal、plan 和测试。
- Render isolation 只检查 region fanout/remount，不把 React StrictMode 或异步 evidence 的额外 bounded commit 当作失败。
- Browser route contract 避免截图作为唯一断言；截图只作为失败排障材料。

## Observability

- Playwright runner 输出 `PASS <projectId> <packIds>`。
- 失败信息包含 `projectId`、`packId`、`ownerClass`、`selector/evidenceKey`、expected coordinate 和 actual coordinate。
- Render isolation 失败信息包含 `projectId`、trigger、allowedRegions、actualCommittedRegions、remountedRegions 和 region commit delta。
- 不新增 runtime logs 或 metrics。

## Test Plan

- Static registry coverage:
  - `pnpm -C examples/logix-react exec vitest run test/playground-registry.contract.test.ts`
- Browser E2E:
  - `pnpm -C examples/logix-react test:browser:playground`
- Focused package tests:
  - 仅当补语义 label 或 evidence attributes 时，运行对应 `packages/logix-playground` component tests。
- Typecheck:
  - `pnpm -C examples/logix-react typecheck`
  - 如触及 package component API，再跑 `pnpm -C packages/logix-playground typecheck`。
- Source-regex authority:
  - 复用 `playground-runtime-evidence-refresh` 的 package-level product path sweep。
  - 本提案 E2E 只保留 route-level negative smoke 与 runtime manifest authority 正向证明。
- Gap harvest:
  - `pnpm -C examples/logix-react test:browser:playground` 必须覆盖 no silent fallback、bounded failure face 和 owner class 输出。
  - 若实施时发现真实内核 gap，verification note 记录 gap owner、route、operation、证据位置和后续提案路径。
- Boundary probes:
  - 至少覆盖 `reflection`、`runtime-run`、`runtime-dispatch`、`control-plane-check`、`control-plane-trial`、`transport`、`projection`、`playground-product` owner classes。
  - 每个 probe 必须声明 trigger 和 expected existing face。
  - 若 probe 暴露真实缺口，测试保持失败，verification note 记录后续提案路径。
- Render isolation:
  - `renderIsolationProbe` 至少覆盖 `local-counter`，并覆盖 `pressure.action-dense` 与 `pressure.trace-heavy` 两条压力 route。
  - 点击 Inspector tab 只允许 Runtime Inspector 相关区域 commit/remount。
  - 点击 bottom tab 只允许 bottom evidence drawer 相关区域 commit/remount。
  - 点击左侧文件只允许 Files panel 与 Source editor 相关区域 commit/remount。
  - 点击 Run/Check/Trial 可以影响 command/result/evidence 相关区域，不应 remount Files panel 或 Source editor。
  - 点击 Reset 可以影响 session/result/evidence owning regions，不应影响 layout/static regions。

## Rollout / Backout

Rollout steps：

1. 先加 proof recipe coverage test，观察 red。
2. 新增 proof packs 和 evidence coordinate helper。
3. 改造 Playwright runner 使用 proof recipes。
4. 补 `local-counter` 与 `service-source` 的编辑闭环。
5. 补 pressure visual capacity 与 runtime evidence probe 分层断言。
6. 先完成 render isolation/state ownership 拆分和 `renderIsolationProbe`。
7. 再补 evidence coordinate visibility，避免 locator 和数据流先加后搬。
8. 回写 SSoT proof law 和 verification note。

Backout plan：

- 可回退新增 proof recipe、proof packs、coordinate helper 和 route contract 扩展。
- 不回退已完成的 runtime evidence refresh。

## Acceptance Criteria

- Proof recipe record keys 与 `logixReactPlaygroundRegistry` project ids exact equal。
- Proof recipe 不复制 route、files、tabs、regions、runtime checks。
- 每个 `/playground/:id` 都通过 all-route invariants。
- 每个 route 至少执行一条 runtime evidence probe，并用 `assertEvidenceCoordinate` 证明 result/diagnostics/trace/snapshot 同源。
- 每个 route 都执行 gap harvest postcheck，证明无 silent fallback；出现 gap 时必须有 owning region、owner class 和 evidence event。
- selected routes 执行 active boundary probes，覆盖全部 owner classes，包括 manifest-valid runtime dispatch failure，并确认每个边界进入既有 failure face。
- selected routes 执行 `renderIsolationProbe`，证明 Inspector tab、bottom tab、file selection、Run/Check/Trial、Reset 的 render fanout 不越过 owning region allowlist。
- `logix-react.local-counter` 覆盖 Action、Driver、Scenario、Run、Check、Trial、Trace 的共享 coordinate 闭环。
- `logix-react.service-source` 覆盖 service source edit to Run output 与 Snapshot changedFiles 闭环。
- 5 个 pressure routes 分别覆盖声明的视觉容量主轴，且 runtime proof 与 mock pressure rows 分离。
- E2E route-level negative smoke 和 manifest authority 正向证明已覆盖 source-regex 回潮风险。
- `pnpm -C examples/logix-react test:browser:playground` 作为主要验收命令。
- 实施后 SSoT 只新增 Dogfooding route proof law，verification note 只记录验证入口和结果。
