---
title: Playground Product Workbench
status: living
version: 4
---

# Playground Product Workbench

## 目标

冻结 Logix Playground 作为用户可见运行时工作台需要的能力、信息分层和界面展示方式。

本页只持有 Playground 产品面事实。Runtime 执行、验证报告、evidence envelope、DVTools 解释工作台、CLI transport 与跨宿主 projection law 分别由对应 owner 持有。

## 当前定位

Playground 是面向 examples 与用户文档的 TypeScript Playground 风格工作台。

它服务三类场景：

- 文档读者打开一个稳定 route，查看源码、运行 Program、读取结果与诊断。
- 维护者在 examples 中 dogfood Logix React 示例，确认源码、运行时结果与诊断能对齐。
- Agent 读取同一份 source snapshot、Run 结果、Check/Trial report 和 bounded logs，完成局部修复。

当前产品落点固定为：

- `packages/logix-playground` 持有可复用 shell、project registry contract、source snapshot、preview adapter、runtime panels 和 derived summary。
- `examples/logix-react` 先作为 dogfooding 宿主，提供 `/playground/:id` 独立路由与首批 curated projects。
- `apps/docs` 后续只消费同一 Playground package 和同一 curated project authority，不复制 shell。
- `@logixjs/sandbox` 继续只做 worker transport，不承接 Playground 产品语义。

下一阶段由 [../../../specs/166-playground-driver-scenario-surface/spec.md](../../../specs/166-playground-driver-scenario-surface/spec.md) 持有，方向固定为 Professional Logic Playground vNext：

- 默认体验是 Logic-first runtime workbench，不要求 UI preview。
- Program source、reflected actions、curated drivers、scenario playback、state/result/log/trace/diagnostics 构成主路径。
- UI preview 退为 optional adapter，只在 project 显式声明 preview capability 时出现。
- session 默认 auto-ready，源码变更自动 restart，正常用户面只保留 Reset session。
- 布局必须升级为 resizable workbench，Source 与 Runtime observation 都是主任务。

内核反射终局由 [../../../specs/167-runtime-reflection-manifest/spec.md](../../../specs/167-runtime-reflection-manifest/spec.md) 持有。166 只消费 167A 的 minimum Program action manifest slice 与 Cross-tool Consumption Law，用于替换源码正则作为 Action Workbench 主 authority。167B 已把 full Program manifest、payload summary/validation、runtime operation event law、CLI self-verification manifest artifact 与 165 bridge input 收敛到 repo-internal reflection contract。

166 与 167 的下沉边界固定为：

- 166 持有 Playground 产品工作台：`ProjectSnapshot`、虚拟文件树、source bundling、sandbox transport adapter、UI layout、Workbench state、Driver/Scenario/Service Source Files product metadata。
- 166 默认运行路径必须消费已有 `Runtime.run`、`Runtime.openProgram`、`Runtime.check`、`Runtime.trial`，不能用 local-counter source parsing 或 fake runner 伪造运行结果。
- G0 已落地 `ProjectSnapshotRuntimeInvoker` 作为 `ProjectSnapshot -> Runtime.run / Runtime.openProgram / Runtime.check / Runtime.trial` 的 Playground host 边界；生产 `PlaygroundShell` 不再导入 fake session runner 或 local Run helper。
- 167 持有可跨 Playground、CLI、Devtools 复用的下层解释能力：167A 的 minimum reflection manifest 与 Cross-tool Consumption Law，以及 167B 的 full reflection manifest、payload summary/validation、runtime operation event law、shared operation coordinate 和 165 bridge input。
- 若某个数据形状要被多个内部工具共享，它应进入 167 repo-internal contract；若只服务 Playground UI 或文档演示，它留在 166 product metadata。

## 权威分层

Playground 只能组合已有权威，不制造第二套诊断事实。

| 面 | Authority | Playground 角色 |
| --- | --- | --- |
| source | `PlaygroundProject` + current `ProjectSnapshot` | 持有当前编辑快照、文件树、active file、revision、digest |
| preview | preview host adapter | optional 展示 UI 运行状态、交互状态、preview errors、preview logs |
| result | `Runtime.run(Program, main, options)` | 展示 JSON-safe bounded result projection |
| diagnostics | `Runtime.check` / `Runtime.trial` 的 `VerificationControlPlaneReport` | 展示 compact report、完整 report 与 repair hints |
| reflection | Runtime Reflection Manifest vNext | 提供 167A minimum action manifest 与 consumption law；167B 提供 Program manifest、payload summary/validation、runtime operation events、CLI manifest artifact 与 165 bridge input |
| projection | Runtime Workbench Kernel | 把 result/report/evidence/debug authority 派生为 session/finding/artifact/gap/drilldown refs |
| transport | `@logixjs/sandbox` | 提供 browser worker compile/run transport |

规则：

- `ProjectSnapshot` 是 Playground 的执行坐标。Source viewer、Run、Check、Trial、Driver、Scenario 和 optional preview 必须读取同一份当前快照。
- Run result 与 Check/Trial report 必须保持 shape separation。
- Run 与 Program session dispatch 必须来自当前快照编译后的 `Runtime.run` / `Runtime.openProgram` 路径，不能来自 source-string simulation。
- Diagnostics summary/detail 中标记为 `runtime.check/*` 或 `runtime.trial/*` 的行只能来自已捕获的 `VerificationControlPlaneReport`；pressure fixture 只能验证视觉容量，不能制造 Runtime-looking diagnostic rows。
- Preview-only error 只能作为 preview host state 或 evidence gap 展示，不能升级成 Logix diagnostic finding。
- Source digest/span 是 context 和 drilldown 坐标，不能成为诊断 truth。
- Selection、active file、expanded panel、console tab、preview lifecycle 都是 host view state。
- Reflected action、advanced raw dispatch、curated Driver 和 Scenario driver step 都是 Program session dispatch consumers；产品测试必须证明它们共享当前 session 的 state、console、operation identity 和 runner/runtime evidence path。
- Run、Check、Trial 是 host commands；它们只写 Run Result 或 Diagnostics，不制造业务 action dispatch log。

### 168 authority parity adoption

Playground 现在对 Run、Diagnostics 与 pressure demo 采用以下分类：

- Run success projection 必须展示 `valueKind / lossy / lossReasons`。业务 `null`、投影后的 `undefined -> null`、stringified value、truncated value 与 failed run 必须可区分。
- Run failure 是 result-face failure，进入 Run Result failure state，并可投影成 Runtime Workbench Kernel 的 `run-failure-facet`。它不写成 `runtime.trial` report。
- Sandbox/transport 层必须保留 `ProgramRunner` wrapper 的 nested cause message，使真实 `main`、boot、dispose 失败能在 Run Result failure 与 evidence gap 中下钻。
- `ProjectSnapshotRuntimeInvoker` 的输出只保留 `runtimeOutput / controlPlaneReport / transportFailure / evidenceGap` 四类。`runtimeOutput` 可携带 `status / valueKind / lossy / lossReasons / failure`。
- Preview-only error 和 host compile failure 只能作为 host state、transport/pre-control-plane failure 或 evidence gap。它们不得进入 `run-result` truth input。
- 标记为 Diagnostics authority 的 route 必须来自真实 `Runtime.check`、`Runtime.trial`、`Runtime.run` failure、reflection owner 或 Workbench projection。压力 route 必须声明 `authorityClass: "visual-pressure-only"` 或等价测试元数据。
- diagnostics demo route 必须声明 owner authority class，并用真实运行路径触发缺 service、缺 config、缺 import、Run failure、Run null value、Run undefined value、payload validator unavailable 或 reflection action evidence gap 等可验证状态。
- Playground session capture 记录 Check report、Trial startup report 与 Run failure projection 的 `authorityRef / artifactRefs / sourceDigest`；当前 compare-compatible proof 只消费 captured Check/Trial report refs。
- Reflection bridge 可消费 167 owner manifest 并展开 action、payload 和 dependency browse nodes；missing manifest、unknown payload schema、stale digest 与 `fallback-source-regex` 只能显示为 evidence gap。

## 已有能力需求

Playground 现有和下一步必须围绕下面能力收口。

| 能力 | 当前落点 | 展示方式 | 关键边界 |
| --- | --- | --- | --- |
| stable route | consuming app route, such as `examples/logix-react/playground/:id` | 新标签页或独立 full viewport app | route owner 在宿主 app，shell 由 package 复用 |
| curated registry | `PlaygroundProject` registry | 顶栏 project id、左侧文件树、not-found state | docs 与 examples 不维护平行 registry truth |
| shared snapshot | `ProjectSnapshot` / workspace revision | editor changed marker、snapshot badge、Snapshot tab | Run/Check/Trial/Preview 共用当前快照 |
| source navigation | file tree + editor | 左 file navigator、中 code editor、line numbers、tabs | source 是阅读和 drilldown 面，不是 report truth |
| source editing | editable files | editor 修改后刷新 snapshot revision | 不能让 runner 绕过 edited files 读取 original files |
| host commands | Run / Check / Trial / Reset / Reload | 顶部 command bar 与右侧 panel toolbar | 每个命令必须有明确输出目标；无 authority 时 disabled with reason |
| service source files | project-declared service file roles in virtual fs | 左侧 service file group、中间 source editor、底部 Snapshot detail | 页面内微调 `*.service.ts` 后验证，不成为 core/react/sandbox public mock API |
| interaction drivers | curated driver + JSON payload | 右侧 Driver panel 或底部 Console detail | 无 UI 时替代点击、输入、下拉；默认不开放 raw action dispatch |
| scenario playback | curated steps + wait/settle + observe/expect | 底部 Scenario/Trace detail 或独立 Scenario lane | 演示多步异步联动，不成为 public authoring DSL |
| React preview | preview adapter | optional Preview lane | preview engine 可替换，不进入 public contract，不是默认 runtime proof |
| Program run | sandbox-backed runner | 右侧 Run Result summary，底部 Console detail | 返回 app-local JSON-safe projection |
| diagnostics | control-plane report | 右侧 Diagnostics summary，底部 Diagnostics detail | 复用 `VerificationControlPlaneReport` |
| logs/errors | bounded log/error session | 底部 Console tab，error badges | compile/runtime/timeout/serialization/worker failure 要区分 |
| trace drilldown | workbench projection + debug/evidence refs | 底部 Trace tab | raw trace 只作下钻材料 |
| snapshot diff | workspace revision + digest refs | 底部 Snapshot tab | diff 属于 host view state，digest mismatch 可投影为 gap |
| derived summary | internal summary adapter | machine-readable status for tests/Agent | summary 不是 evidence ledger |
| docs reuse | `PlaygroundPage` + registry/project id | docs link opens same route shape | docs 不复制 panels、snapshot builder、runner |

## 界面展示方式

终局界面固定为直接进入工具，不做 landing page。

默认 desktop 布局：

```text
compact top command bar
  project identity, snapshot status, Run, Check, Trial, Reset, Reload

main horizontal resizable workspace
  left: file navigator
  center: TypeScript source editor with tabs and line numbers
  right: runtime inspector
    State
    Last operation
    Run Result
    Actions / Drivers / Scenarios
    Diagnostics summary
    Preview when project declares preview capability

bottom resizable evidence drawer
  Console
  Diagnostics detail
  Trace
  Snapshot
```

布局规则：

- 全浏览器 viewport，紧凑工程工具风格。
- 顶栏优先显示 `Logix Playground`、project id、snapshot revision/status、Run/Check/Trial。
- 左侧 file navigator 只展示当前 project files、generated files 和 changed state。
- 中央 editor 是最大工作区，必须有 line numbers、file tabs、read-only/editable signal。
- 中央 editor 默认使用 Monaco。TypeScript-family source 必须启用 Monaco TypeScript language service 的 completion、diagnostics、hover 和 navigation 能力。
- 右侧 runtime inspector 默认优先展示 State、Actions/Drivers、last operation 与 Run Result。Diagnostics 可作为 summary lane，Preview 只在项目声明 preview capability 时出现。
- 底部 strip 展示 Console、Diagnostics detail、Trace、Snapshot，适合查看长文本、raw detail 和 diff。
- File navigator、runtime inspector 与 bottom evidence drawer 的尺寸调整必须通过真实可交互 resize handles 完成，当前由 `react-resizable-panels` 承载，并把规范化像素尺寸写回 Playground host layout state。
- Source/Action/State/Run 是初始主路径；Check/Trial 必须由用户显式触发或展开。
- UI 使用 compact panels、tabs、toolbar buttons、status badges 和 subtle borders；禁止营销 hero、装饰背景、嵌套 cards 和平台叙事文案。
- Files、runtime inspector 与 bottom evidence drawer 必须可调尺寸。布局状态属于 Playground host state，优先由 Playground workbench Logix module 承载。
- 测试选择器必须表达区域身份。重复标签必须先限定到 `Runtime inspector`、`Action workbench` 或 `Workbench bottom console` 等 owning region，再点击或断言。
- 166 的具体尺寸、滚动归属、sticky 区域和压力态验收由 [../../../specs/166-playground-driver-scenario-surface/ui-contract.md](../../../specs/166-playground-driver-scenario-surface/ui-contract.md) 持有；五张视觉压力图已经转成带 YAML front matter 的可执行约束文档。

## Dogfooding Route Proof Law

`examples/logix-react` `/playground/:id` browser coverage is the executable proof surface for curated Playground demos.

Rules:

- The test matrix is registry-indexed. Route, files, capabilities, drivers, scenarios, service files and pressure metadata are derived from `PlaygroundProject`.
- Each route must prove all-route shell/source/snapshot invariants and at least one runtime evidence probe.
- Runtime alignment uses a single evidence coordinate across result, diagnostics, trace and snapshot faces.
- Playground dogfood proof must cover both runtime evidence alignment and React host render isolation. Local UI controls must not force unrelated workbench regions to re-render or remount; evidence coordinates prove runtime truth alignment, while render isolation probes prove state ownership and subscription boundaries.
- Pressure rows prove visual capacity only; runtime authority is proven by separate runtime evidence probes.
- Boundary probes must route missing authority, compile/transport/runtime failure and projection gaps into existing evidence gap, control-plane, transport or projection faces.
- Boundary probes are dogfooding pressure against runtime boundaries. Passing UI text without matching runtime evidence coordinate does not satisfy this law.
- SSoT does not copy the route-by-route executable matrix.

移动端可以折叠为：

```text
top command bar
tabs: Source | Result | Diagnostics | Console
```

移动端仍必须保留稳定 route、source-first reading path、Run/Check/Trial actions 和 bounded error state。

## Monaco 编辑器与类型感知

Playground 的所有 editor surface 默认使用 Monaco，包括 source、service、fixture、JSON payload 和 advanced raw dispatch。早期 `examples/logix-sandbox-mvp` 已经验证过可行方向：`@monaco-editor/react`、自定义 Monaco workers、TypeScript worker 注入本地 type bundle、`extraLibs`、`typescriptDefaults.setEagerModelSync(true)`。

166 的终局要求是把这套能力迁到 `packages/logix-playground`，由 Playground package 持有，不继续留作 sandbox MVP 私有实现。

规则：

- Monaco 是正常路径；textarea 只允许作为加载失败时的 bounded fallback。
- JSON payload 与 advanced raw dispatch 也走同一 package-owned Monaco adapter。
- Monaco model URI 必须来自 `ProjectSnapshot.files` 的 virtual path，例如 `file:///src/main.program.ts`。
- 当前 snapshot 的所有 source files 必须同步成 Monaco models，保证虚拟源码树内部相对 import 可补全、可诊断。
- `@logixjs/*`、`effect`、React 与必要 transitive type 必须通过本地生成的 type bundle 或等价 `extraLibs` 注入。
- 166 已把 package-owned type bundle generator 落在 `packages/logix-playground/scripts/generate-monaco-type-bundle.ts`，当前 bundle 从 workspace package dists/src 与本地 pnpm 类型包生成，不依赖远程类型源。
- 默认 docs-ready route 不依赖远程 CDN、Sandpack packager 或真实 npm registry 来加载类型。
- Monaco diagnostics 是 editor feedback，不替代 `Runtime.check` 或 `Runtime.trial`。
- Monaco/LSP loading、worker 状态、type bundle 状态属于 Playground host/editor state，不进入 Runtime Workbench Kernel truth。
- Monaco loading 与 textarea fallback 必须预留与 Monaco ready 状态一致的 line-number / decorations gutter 和 editor padding，避免加载完成时 source text 横向或纵向跳动。

## 标准 Playground 项目结构

Playground 项目分两层目录：

```text
用户可见 virtual source tree
  -> 展示在 Playground 文件树中
  -> 进入 ProjectSnapshot
  -> 被 Run / Check / Trial / Driver / Scenario 消费

作者侧 project declaration tree
  -> examples/docs 维护
  -> 负责 definePlaygroundProject(...)
  -> 持有 Driver / Scenario / serviceFiles 元数据
```

标准 virtual source tree：

```text
/src/main.program.ts
/src/logic/<domain>.logic.ts
/src/services/<service>.service.ts
/src/fixtures/<fixture>.fixture.ts
/src/preview/App.tsx
```

规则：

- Logic-first 项目默认用 `/src/main.program.ts` 作为 `program.entry`。
- `*.program.ts` 是 Program 装配入口，负责导入 logic/service/fixture，构建 `Program`，必要时导出 `main`。
- `*.logic.ts` 放 Logix logic units、action 声明邻近代码和领域运行行为。
- `*.service.ts` 是普通可编辑 service 实现源文件，进入同一 `ProjectSnapshot`。
- `*.fixture.ts` 只放需要在 Playground 中可见或可编辑的 example-local 数据。
- `/src/preview/App.tsx` 只在项目显式声明 preview capability 时出现。
- Driver / Scenario 声明默认不属于 runtime source tree。它们是 Playground project metadata。
- 新 Logic-first 示例不再推荐裸 `/src/program.ts`。

标准作者侧 project declaration tree：

```text
examples/<host>/src/playground/projects/<project-id>/
  index.ts
  files.ts
  drivers.ts
  scenarios.ts
  service-files.ts
  sources/
    src/main.program.ts
    src/logic/<domain>.logic.ts
    src/services/<service>.service.ts
    src/fixtures/<fixture>.fixture.ts
    src/preview/App.tsx
```

规则：

- `index.ts` 导出唯一 `definePlaygroundProject(...)`。
- `files.ts` 把 `sources/**` 映射为标准 virtual paths。
- `drivers.ts`、`scenarios.ts`、`service-files.ts` 是可选产品元数据模块。
- docs 与 examples 必须复用同一 project declaration authority，不能复制一份平行 source map。
- 单文件或极小 demo 可以暂时内联，但 virtual paths 仍要符合标准。

## Host Command、Service Files、Driver 与 Scenario 边界

Playground 的交互词汇分四层。不要再把它们都叫 trigger。

### Host Command

Host Command 是 Playground shell 自己的命令。

允许：

- 顶栏命令：Run、Check、Trial、Reset、Reload。
- editor change：产生新 `ProjectSnapshot` revision。
- Program `main(ctx,args)`：承接非 UI runtime result face。
- Trial startup：承接装配、依赖、启动和关闭诊断。

Host Command 不表达业务交互。它只启动已有 runtime face 或改变 Playground host state。

下一阶段交互规则：

- 打开有效 Program project 后 session 默认 ready。
- 正常用户面不提供 `Start session` 或 `Close session`。
- `Reset session` 是唯一 session control，含义是用当前 snapshot 重建 session 并清理 session-derived output。
- source edit 自动产生新 revision 并 restart session。正常路径不展示 stale 警告，只在竞态或异常保护中保留 stale fallback。
- `Run` 写入 Run Result。
- `Check` 与 `Trial` 写入 Diagnostics summary/detail。
- Run、Check、Trial 与 action dispatch 的默认路径必须调用已有 Runtime faces；Playground 只拥有 host adapter 与 product projection。
- 没有真实输出的 command 不进入 primary command bar。

### Service Source Files

Service Source Files 是 Playground virtual fs 中的 service 逻辑源文件组织方式。它用于让读者或 Agent 像改普通代码一样编辑 project 预设的 service 文件，例如 `src/services/search.service.ts` 或 `src/mocks/search.service.ts`，然后用同一份 `ProjectSnapshot` 运行 Run、Driver、Scenario、Check 或 Trial。

长期产品需求由 [../../../specs/166-playground-driver-scenario-surface/spec.md](../../../specs/166-playground-driver-scenario-surface/spec.md) 持有。166 现在持有 Professional Logic Playground vNext 总规格，Driver/Scenario 是其中两条能力线。

允许：

- project 显式声明 service file role metadata，用于文件树分组、快捷导航、默认文件选择和验证提示。
- service file 是普通 `PlaygroundFile`，背后进入同一 `ProjectSnapshot`。
- 用户在 source editor 中编辑 service file。
- service file edit 产生新的 snapshot revision。
- Run、Driver、Scenario、Check、Trial 消费同一份 source snapshot。
- Service source validation failure、service execution failure 与 runtime failure 分开展示。

默认不允许：

- 新增 `Program.capabilities.mocks`。
- 把 service mock declaration、service source helper 或 mock editor API 放进 core/react/sandbox public surface。
- 把 sandbox public surface 变成 mock API。
- 新增独立 Service Mock panel、mock response table、mock revision、mock overlay 或 mock workspace state。
- 默认替换任意 service。
- 页面直接 patch 业务源码 import 来替换 service。
- 把 service source file、service role metadata 或 half-edited source buffer 当成 Runtime Workbench Kernel truth input。
- 持久化用户自定义 mock、共享 mock 链接或云端 mock workspace。

### Interaction Driver

Interaction Driver 是无 UI 或 UI-optional 示例中的手动驱动入口。它用于替代 preview 中的点击、输入、下拉。

长期产品需求由 [../../../specs/166-playground-driver-scenario-surface/spec.md](../../../specs/166-playground-driver-scenario-surface/spec.md) 持有。166 现在持有 Professional Logic Playground vNext 总规格，Driver/Scenario 是其中两条能力线。

允许：

- project 显式声明 curated driver。
- 用户选择 driver，输入或选择 JSON payload。
- Playground 触发 dispatch/invoke。
- Result、Console、Trace、Snapshot 展示 driver 执行后的变化。
- Driver declaration 只作为 `PlaygroundProject` 的可选 product metadata 存在。
- docs/examples 必须通过同一 project registry authority 复用 driver declaration。

默认不允许：

- 暴露任意 raw action dispatch。
- 把 driver payload shape 变成 Logix public action contract。
- 用 driver declaration 替代业务 authoring surface。
- 把 driver declaration 放进 core/react/sandbox public surface。

### Reflected Action Workbench

Reflected Action Workbench 是 Playground 面向维护者、Agent 和内部 dogfooding 的 Program action 操作面。

允许：

- 从 167 minimum Program action manifest slice 读取 root Program actions。
- 对 `Schema.Void` action 显示直接 dispatch 按钮。
- 对 non-void action 显示 JSON payload 输入。
- dispatch 后展示 state、result、logs、trace、operation id 和 snapshot revision。

默认边界：

- docs 面默认优先 curated Driver；反射 action 面可以作为 advanced workbench 展示。
- raw dispatch 只允许折叠在 advanced 区，不作为默认用户路径。
- raw dispatch 面默认隐藏，只接受 JSON action object，并且必须先通过当前 manifest action tag 校验。
- Sandpack 只作为 preview adapter，不是 runtime truth。
- 源码正则不得作为产品路径的 runnable action authority。manifest 提取失败时只能展示 unavailable state 与 runtime evidence gap，不能用 source parsing 生成可点击 action。若仍保留 regex helper，它只能位于测试支撑或 archive witness，并且必须命名为 forbidden/negative evidence。

### Scenario Playback

Scenario Playback 是多步演示播放面，用于异步联动、状态流和无 UI 流程 demo。

长期产品需求由 [../../../specs/166-playground-driver-scenario-surface/spec.md](../../../specs/166-playground-driver-scenario-surface/spec.md) 持有。166 现在持有 Professional Logic Playground vNext 总规格，Driver/Scenario 是其中两条能力线。

允许：

- curated steps。
- run all 与 step-by-step。
- wait/settle。
- observe/expect。
- per-step result、duration、trace refs 和 snapshot refs。
- Scenario declaration 只作为 `PlaygroundProject` 的可选 product metadata 存在。
- Scenario Playback 产物必须先成为 result、report、evidence、debug refs 或 gap，才可进入 Runtime Workbench Kernel。

禁止：

- 把 preview 点击、输入事件升级成 Logix authoring DSL。
- 把 Scenario Playback 当成用户文档业务逻辑资产。
- 把 Scenario Playback 的 expect 当成 `runtime.compare` truth。
- 用 Sandpack 或 preview host 的内部协议解释 Logix diagnostics。
- 用 raw logs 或 stack trace 反推 source truth。
- 把 scenario step language、wait/settle 或 observe/expect 语义直接传给 Runtime Workbench Kernel。

## 与 Runtime Workbench Kernel 的关系

跨 Playground、DVTools、CLI 的 projection law 由 [../../../specs/165-runtime-workbench-kernel/spec.md](../../../specs/165-runtime-workbench-kernel/spec.md) 持有。

Playground 对 165 的需求固定为：

- 能把 Run result、Check report、Trial report、evidence/debug refs 派生为 session-rooted projection。
- 能为右侧 Result/Diagnostics panel 提供 session、finding、artifact、gap 和 repair mirror refs。
- 能为底部 Trace/Snapshot lanes 提供 drilldown refs、source digest refs、runtime coordinate refs 和 evidence gaps。
- 能保留 shape separation，避免 Run result 被包装成 report。
- 能把 source digest mismatch、missing focusRef、missing artifact key、preview-only host error 表达为 evidence gap。
- 能消费 Driver/Scenario 执行后产生的 result、report、evidence、debug refs 或 evidence gaps。
- 能把 service file path、source digest 与 service failure 作为 context、drilldown 或 gap 关联到 produced output。
- 不持有 active file、selected panel、editor cursor、preview lifecycle、console tab 或 docs route state。
- 不持有 Driver schema、payload schema、dispatch/invoke、step runner、wait/settle 或 expect 语义。
- 不持有 service role metadata、service source file body 或 half-edited source buffer。

165 必须服务这些展示需求，但不能接管界面布局。Playground shell 仍由 `packages/logix-playground` 持有。

## 与 Runtime Reflection Manifest vNext 的关系

Runtime reflection 由 [../../../specs/167-runtime-reflection-manifest/spec.md](../../../specs/167-runtime-reflection-manifest/spec.md) 持有。

Playground 对 167 的需求固定为：

- 166 MVP 只要求 minimum Program action manifest slice：program id、module id、action tag、payload kind、authority、digest。
- Action Workbench 必须优先使用 167 manifest authority。
- payload summary、payload validation、Program full manifest、manifest diff、runtime operation event law 和 workbench bridge 属于 167B repo-internal contract；Playground 可以消费这些产物，但仍只拥有 UI-local view model。
- `RuntimeReflectionManifest`、`PayloadValidationIssue` 与 `RuntimeOperationEvent` 的 owner 是 167。Playground 的 JSON text parse error 仍是 consumer-local product input failure。
- Workbench reflection bridge 现在展开 action、payload 与 dependency nodes，并以 `sourceRef / focusRef / manifestDigest` 支持 drilldown；Playground 只渲染这些 repo-internal owner facts。
- CLI `check` 与 `trial` 现在会输出 `reflectionManifest` artifact，Playground/DVTools/Agent 可以用其 digest 对齐同一 Program declaration。
- Playground 可以渲染 167 产物，但不能定义自己的私有 manifest schema。
- Driver/Scenario/Service Source Files 仍是 Playground product metadata，不进入 core reflection manifest truth。它们只能通过 product adapter 变成 context refs、produced outputs 或 evidence gaps。
- 167 不接管 Playground 的 source bundling、sandbox transport、UI layout 或 product session state；这些仍归 166。

## Must Cut

- Logic-first project 默认 `App.tsx` 与默认 preview。
- 正常用户面的 `Start session`、`Close session`、`No active session`。
- 只展示提示文案、不展示真实输出的 Program panel。
- 看起来可点击但没有可见输出的 Run/Check/Trial command。
- local-counter source parsing 或 fake runner 成为默认 Run/session dispatch 实现。
- 源码正则成为 Action Workbench 主 authority。
- Playground 私有 action manifest schema 与 167 并行。
- Playground 自定义 diagnostic report schema。
- Playground 私有 session/finding/artifact authority。
- Playground 私有 service report schema 或 service evidence envelope。
- docs 与 examples 的平行 project registry。
- sandbox-owned Playground product API。
- sandbox-owned service mock API。
- public editor/preview adapter contract。
- driver DSL、UI interaction DSL 或 scenario DSL 进入 authoring surface。
- service mock API、service source helper 或 mock editor API 进入 core/react/sandbox public surface。
- raw action dispatch 成为默认 Playground 用户面。
- Sandpack 成为 Logix diagnostic authority。
- raw trace、raw log 或 source locator 成为首屏 truth。
- 只展示 JSON result、缺少 source 和 diagnostics 的 Program playground。

## 验收

- `examples/logix-react` 有独立 `/playground/:id` route，首屏进入工具界面。
- `packages/logix-playground` 的默认 shell 呈现 top command bar、file navigator、source editor、runtime inspector 和 bottom evidence drawer。
- Logic-first project 不依赖 `App.tsx` 或 preview。
- 打开有效 Program project 后 session 默认 ready，源码变更自动 restart，正常用户面只提供 Reset session。
- Files、runtime inspector 和 bottom evidence drawer 可调尺寸。
- Playground 术语稳定区分 Host Command、Service Source Files、Interaction Driver 和 Scenario Playback。
- Action Workbench 消费 runtime-backed reflection manifest 或 167 minimum Program action manifest slice；manifest 不可用时展示 unavailable state 与 evidence gap，源码正则不能作为产品 fallback。
- 至少一个 project 证明同一 shared source edit 能影响 Program run 或 action/session state，并让 Run/Check/Trial 使用同一 snapshot。
- Run、Check、Trial 输出 shape 在 UI 和 summary 中可区分。
- State 与 Actions/Drivers 在默认 desktop 布局下可同时观察。
- Diagnostics、Trace、Snapshot 展示的数据都能回到 authority refs、derivedFrom 或 host view state 分类。
- Run Result 展示 `valueKind / lossy / lossReasons`，并能把 run failure 与成功的 `null` value 分开。
- pressure fixture 的 diagnostics-looking 内容只验证视觉容量；真实 diagnostics route 通过 owner-backed runtime evidence 证明。
- docs 后续可通过 registry/project id 消费同一 shell，不复制 Playground 产品代码。

## 当前一句话结论

Playground 是 source snapshot 驱动的 Logic-first runtime workbench；它的界面采用 top command bar + resizable file navigator + source editor + runtime inspector + bottom evidence drawer，交互词汇区分 Host Command、Reflected Action Workbench、Interaction Driver、Scenario Playback 和 Service Source Files，诊断解释统一消费 Runtime Workbench Kernel，产品 shell 和 host state 留在 `packages/logix-playground`。
