---
title: DVTools Internal Workbench
status: living
version: 7
---

# DVTools Internal Workbench

## 目标

冻结 DVTools 的北极星、边界、职责与删除方向。

本页只承接 DVTools 作为内部诊断工作台的长期事实。它不重开 `@logixjs/devtools-react` 的公开 surface，不重开 verification control plane，不重开 authoring surface。

## 北极星

DVTools 是 Logix 的内部证据解释工作台。

它面向三类使用者：

- runtime / React / domain 维护者
- 本仓 examples 与 dogfooding 场景的调试者
- Agent repair loop 的证据消费者

它的核心任务是把 runtime evidence、control-plane report、debug event 和 artifact 转成可定位、可比较、可行动的诊断视图。

DVTools 的终局判断标准固定为：

- 先给出问题归因，再允许下钻 raw trace
- 先按 session / finding / artifact attachment 聚合，再展示事件流水账
- live 与 imported evidence package 得出一致结论
- 所有结论都能回到统一 evidence envelope、`VerificationControlPlaneReport` 或 runtime debug event
- 不制造第二套 authoring 入口、第二套 verification lane、第二套 report shape 或第二套 runtime truth

## 当前定位

`@logixjs/devtools-react` 的 public survivor set 已归零。

因此 DVTools 当前只能作为：

- repo-internal browser inspection surface
- app-local wiring
- examples / dogfooding support
- evidence package viewer
- control-plane report explainer

DVTools 不再作为：

- public package API
- root import side-effect
- official authoring helper
- verification control-plane root command
- runtime capability slot
- platform product surface

## 与 Runtime Control Plane 的关系

Runtime control plane 继续由 `runtime.check / runtime.trial / runtime.compare` 持有。

跨 Playground、DVTools、CLI 的 session / finding / artifact / coordinate 投影语义由 [../../../specs/165-runtime-workbench-kernel/spec.md](../../../specs/165-runtime-workbench-kernel/spec.md) 持有。DVTools 只持有 live runtime / imported evidence 宿主职责、内部布局职责和导入导出职责。

DVTools 只能消费这些产物：

- `VerificationControlPlaneReport`
- `repairHints.focusRef`
- `artifacts[]`
- `RuntimeReflectionManifest` artifact refs and digest from 167/CLI transport
- `RuntimeOperationEvent` debug evidence from 167 event law
- canonical evidence envelope
- slim runtime debug events
- domain-owned opaque stable ids

DVTools 不得新增：

- `Runtime.devtools`
- `runtime.devtools`
- `Runtime.inspect`
- `runtime.inspect`
- DVTools 专属 report protocol
- DVTools 专属 evidence envelope
- DVTools 专属 scenario language
- DVTools 私有 session/finding/artifact derivation truth

若某个能力需要成为默认验证入口，它必须先进入 [09-verification-control-plane.md](./09-verification-control-plane.md)。

## 阶段策略

DVTools 的阶段目标分两层。

当前优先级最高的是 Agent 自我验证闭环：

```text
DVTools selected session / finding
  -> canonical evidence package export
    -> Logix CLI import
      -> runtime.check / runtime.trial / runtime.compare
        -> VerificationControlPlaneReport + repair hints
          -> Agent repair
            -> trial / compare closure
```

规则：

- DVTools 可以导出 canonical evidence package。
- 导出时可以附带 selection manifest，用于记录当前选中的 session、finding、artifact key、focusRef 与稳定 runtime 坐标。
- selection manifest 中的 artifact key 必须使用 CLI/control-plane `artifacts[].outputKey` namespace；若当前只有浏览器侧 raw artifact locator，必须作为 canonical evidence artifact ref 导出，不得创建第二套 artifact key。
- selection manifest 只作为 CLI 和 Agent 的入口提示，不作为 evidence truth。
- CLI 必须继续消费 canonical evidence、artifacts 与 runtime control plane report，不得消费 DVTools 专属协议。
- Agent repair 的默认输入应来自 CLI machine report、repair hints、artifact output keys 与 stable coordinates。

CLI import roundtrip 已由 `162` 覆盖：`packages/logix-cli/test/Integration/evidence-selection-roundtrip.contract.test.ts` 证明 canonical evidence package 与 selection manifest 能进入 `check` transport artifacts，selection authority 保持 `hint-only`，`artifactOutputKey` 必须落在 evidence package 的 artifact key namespace。`packages/logix-cli/test/Integration/evidence-selection-input.contract.test.ts` 继续覆盖输入 gate 与 transport 形状。

中后期方向是把高成本浏览器采集和 profiling 宿主外移到 Chrome DevTools 或等价浏览器扩展。

当前不把 Chrome DevTools 宿主迁移纳入 `159` closure。它只作为未来 reopen 方向记录，等待极限性能优化和浏览器级采集需求变成主线后再单独立项。

## 主链

DVTools 默认主链固定为：

```text
scope
  -> session
    -> finding
      -> artifact attachment
        -> drilldown
```

规则：

- session、finding、artifact attachment、source coordinate 与 evidence gap 的跨宿主投影语义委托给 Runtime Workbench Kernel；manifest/action/payload/operation 的共享解释语义委托给 167 repo-internal reflection contract。
- `focusRef` 只作为 finding 或 artifact attachment 上的稳定坐标。
- `VerificationControlPlaneReport` 只作为 finding 输入或 raw explainer drilldown。
- artifact attachment 只能从 report artifacts 或 evidence artifacts 派生，不能形成 root lane。
- timeline、inspector、field graph、converge、lane、state JSON、raw event JSON 都是 subordinate drilldown。
- 默认第一屏只能由紧凑 header、session navigator、selected session workbench 组成。
- findings 必须回到 selected session workbench 主体，不另建默认右侧主 lane。

## 中区职责

面向终局，DVTools 只保留六类职责。

### 1. Session Workbench

默认入口必须按交互会话或运行证据窗口组织。

Session 至少回答：

- 入口是什么
- 影响了哪个 runtime / module / instance
- 发生了多少 transaction / commit / render / evidence event
- 是否 degraded、dropped、oversized、inconclusive
- 下一步该看哪个 finding 或 focusRef

Timeline 只作为 session 的二级下钻视图，不再作为默认主视图。

### 2. Advisor Findings

DVTools 必须优先展示由 Runtime Workbench Kernel 派生的 authority-backed finding projection。

Finding projection 至少回指：

- authority ref 或 derivedFrom
- evidence refs
- focusRef
- artifact attachments
- mirrored repairHints 或 nextRecommendedStage refs
- evidence gap

Finding projection 只解释已有 report、evidence、debug authority 或 run result projection。证据不足时必须显式返回 evidence gap，不得用 UI 猜测补全事实。

Artifact attachment 是 finding 的附属对象。它至少保留 artifact key、artifact ref、evidence refs、focusRef 与 sourceRef。artifact key 必须对齐 `artifacts[].outputKey`；artifact ref 只表示可解引用 locator，不是第二套 key namespace。缺 artifact key 时只能产生 evidence gap，不能让 UI 自造 artifact truth。

### 3. Evidence Package Import / Export

同一份 evidence package 在 live 和 imported 模式下必须经 Runtime Workbench Kernel 得到等价 session、metric、finding 与排序结果。

Imported mode 不得成为第二解释器。它只能把 evidence package 映射到同一套 projection law。

Export mode 只能输出 canonical evidence package 和 selection manifest。它不得输出 DVTools 自己的 report truth、session truth 或 finding truth。

### 4. Control-Plane Report Explainer

DVTools 可以展示 `VerificationControlPlaneReport`。

展示时必须保留：

- `stage`
- `mode`
- `verdict`
- `errorCode`
- `summary`
- `artifacts`
- `repairHints`
- `nextRecommendedStage`

DVTools 不得把 report 顶层展开成长表协议，也不得把 raw evidence 升格为默认比较面。

Report 缺少可关联坐标时，只能进入 Runtime Workbench Kernel 的 bounded evidence gap，例如 `missing-focus-ref` 或 `missing-artifact-output-key`，不能创建独立 report lane 或第二 summary model。旧 `report-only-evidence`、`missing-artifact-key` 属于 `159` 历史 gap family，不再是当前 DVTools 生产口径。

### 5. Runtime Debug Drilldown

DVTools 可以展示 runtime debug event、state snapshot、transaction summary、field graph、converge lane、hot lifecycle event 等下钻视图。

这些视图必须满足：

- 只从 canonical evidence 或 repo-internal debug API 派生
- 不拥有新 truth
- 不影响 runtime 执行语义
- 不回流为 public authoring surface

FieldGraph 只能作为 Inspector / Timeline 的内部联动面存在。

### 6. Agent Repair Coordinate Surface

DVTools 必须服务 Agent 快速定位。

所有可行动视图都应尽量带：

- `declSliceId`
- `reasonSlotId`
- `scenarioStepId`
- `sourceRef`
- artifact output key
- runtime / module / instance / txn / op 稳定坐标

若某个视图无法提供稳定坐标，它只能作为辅助展示，不得成为默认 repair 入口。

## 必须删除

下一轮 DVTools cutover 默认删除这些残留：

- public root export 残留
- public subpath 残留
- root style side effect 残留
- wildcard export 残留
- Timeline-first 默认布局
- 以 raw event stream 作为主心智的 UI
- 字符串解析诊断 payload 的逻辑
- 与 control-plane report 并行的本地 report object
- DVTools 自己定义的 evidence truth
- 默认开启的 state mutation / time travel 控制
- 面向旧 FieldGraph public component 的独立入口
- app author 需要手写的 devtools wiring recipe

## 可以保留但必须下沉

这些能力可以保留，但只能留在内部下钻或专项层：

- raw timeline
- state snapshot JSON
- FieldGraph
- converge performance detail
- lane overview
- hot lifecycle event view
- imported evidence JSON
- settings / thresholds
- time travel

其中 time travel 默认必须关停或进入明确实验开关。它改变运行时状态，不应作为证据解释工作台的默认能力。

## 布局原则

DVTools 的界面布局按工作台收敛。

固定原则：

- 默认第一屏是 session list + selected session workbench
- 顶部区域只保留全局范围选择、模式状态和关键 verdict
- workbench 主体必须可滚动
- timeline、inspector、raw JSON 都是二级 tab 或 drawer
- 面板高度变化不得导致主内容不可访问
- header、overview、summary 不得堆叠成遮挡主诊断区的固定高区
- 多 runtime / module / instance 选择必须约束 session 和 finding，不单独改变证据 truth

## 数据派生原则

DVTools 消费 Runtime Workbench Kernel 的 projection law。DVTools 宿主侧链路固定为：

```text
evidence / report / debug snapshot
  -> normalized input
    -> Runtime Workbench Kernel projection index
      -> session workbench
        -> drilldown views
```

规则：

- session boundary 与 gap projection law 委托 [../../../specs/165-runtime-workbench-kernel/spec.md](../../../specs/165-runtime-workbench-kernel/spec.md)
- live 与 imported 使用同一 projection law
- timestamp 只能用于展示或弱排序，不能独自作为权威排序键
- 排序优先使用 `runtimeLabel / moduleId / instanceId / txnSeq / opSeq / eventSeq`
- action event 只作为 session label 或 suggested entry，不独自持有 session boundary truth
- missing coordinate 必须进入 evidence gap
- UI state 不能反向改写 evidence truth
- v1 的 DVTools component disposition、cutover proof pack 与实现验收由 [../../../specs/159-dvtools-internal-workbench-cutover/spec.md](../../../specs/159-dvtools-internal-workbench-cutover/spec.md) 冻结

## 性能与成本原则

DVTools 不得向默认 runtime 热路径增加成本。

固定规则：

- diagnostics disabled 时不得依赖 DVTools correctness
- DVTools UI 计算必须在 consumer side 派生
- high-density evidence 必须有窗口化或降级策略
- 默认视图不得渲染全量 raw trace
- 任何新增诊断事件都必须 slim、可序列化、可稳定比较
- 触及 runtime debug hub、evidence export 或 hot lifecycle evidence 的实现必须给可复现 baseline
- 当前 Agent 自我验证阶段可以接受按需 instrumentation，但不能让 silent collection 或 recording 成为默认运行时成本
- 性能 profiling 数据若会改变页面原本执行成本，必须显式标注采集档位、测量干扰和适用范围
- 极限性能 profiling 的采集宿主优先外移到 Chrome DevTools 或等价浏览器扩展，不在 runtime 默认路径内扩张

## 与 `@logixjs/toolkit` 的关系

若未来需要用户可调用的 devtools DX helper，只允许先走 toolkit intake。

准入前提：

- helper 完全建立在既有 runtime / evidence truth 上
- 可展开回 core / control-plane primitive
- 不新增 authoring 主链
- 不新增 verification lane
- 不把 repo-internal inspection surface 包装成公开产品 API

当前不接受任何 `@logixjs/devtools-react` public survivor。

## Owner 与落点

当前 owner 分层固定为：

| 层 | owner | 角色 |
| --- | --- | --- |
| evidence contract | `@logixjs/core` | evidence envelope、runtime debug event、control-plane report |
| host projection evidence | `@logixjs/react` | React host cleanup summary、render / selector evidence |
| browser trial surface | `@logixjs/sandbox` | browser verification host wiring |
| internal workbench | `packages/logix-devtools-react/src/internal/**` | repo-internal UI 与 derivation |
| CLI analysis loop | `@logixjs/cli` | evidence import、`check / trial / compare` 编排与 machine report 输出；CLI 边界看 [15-cli-agent-first-control-plane.md](./15-cli-agent-first-control-plane.md) |
| examples dogfooding | `examples/**` | app-local mounting and proof scenarios |

DVTools 的生产包可以继续存在于 workspace，但其 public exact surface 继续归零。

## Agent repair roundtrip pressure

[16-agent-self-verification-scenario-matrix.md](./16-agent-self-verification-scenario-matrix.md) 只提供 pressure index。进入本页 owner 的采纳条件固定为：

- selected session / finding export 必须能形成 canonical evidence package + selection manifest。
- selection manifest 继续只作 hint，不改变 evidence truth、report truth、session truth 或 finding truth。
- CLI import 后，Agent repair 必须能通过 report focus、artifact outputKey 或 owner-defined locator 找到 repair target。
- artifact key 继续等同于 `artifacts[].outputKey`；DVTools 不得自造第二 key namespace。
- DVTools roundtrip proof 不得要求 raw trace 全量进入默认 compare 面。

当前 proof refs：

- `packages/logix-cli/test/Integration/evidence-selection-input.contract.test.ts`
- `packages/logix-cli/test/Integration/evidence-selection-roundtrip.contract.test.ts`
- `packages/logix-cli/test/Integration/exact-rerun-coordinate.contract.test.ts`

对应实施 spec：

- DVTools workbench 主线：[../../../specs/159-dvtools-internal-workbench-cutover/spec.md](../../../specs/159-dvtools-internal-workbench-cutover/spec.md)
- CLI roundtrip transport：[../../../specs/162-cli-verification-transport/spec.md](../../../specs/162-cli-verification-transport/spec.md)
- core/kernel pressure：[../../../specs/161-verification-pressure-kernel/spec.md](../../../specs/161-verification-pressure-kernel/spec.md)

## 需求落点

下一轮需求固定为：

- [../../../specs/159-dvtools-internal-workbench-cutover/spec.md](../../../specs/159-dvtools-internal-workbench-cutover/spec.md)
- [../../../specs/162-cli-verification-transport/spec.md](../../../specs/162-cli-verification-transport/spec.md)

该需求必须以本页为 authority。旧 `specs/038-devtools-session-ui`、`specs/015-devtools-converge-performance` 和早期 observability specs 只作为背景材料，不作为当前真相源。

## 相关规范

- [01-public-api-spine.md](./01-public-api-spine.md)
- [04-capabilities-and-runtime-control-plane.md](./04-capabilities-and-runtime-control-plane.md)
- [09-verification-control-plane.md](./09-verification-control-plane.md)
- [10-react-host-projection-boundary.md](./10-react-host-projection-boundary.md)
- [11-toolkit-layer.md](./11-toolkit-layer.md)
- [15-cli-agent-first-control-plane.md](./15-cli-agent-first-control-plane.md)
- [../../standards/logix-api-next-guardrails.md](../../standards/logix-api-next-guardrails.md)

## 当前一句话结论

DVTools 是内部证据解释工作台：以 scope / session / finding / artifact attachment 为默认主链，`focusRef` 只作为稳定坐标；它消费统一 runtime control plane 与 evidence envelope，不拥有 public surface、authoring surface、verification lane、report shape 或 runtime truth。
