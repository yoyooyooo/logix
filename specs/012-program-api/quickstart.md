# Quickstart: Process（长效逻辑与跨模块协同收敛）

**Feature**: [spec.md](./spec.md) (`/Users/yoyo/Documents/code/personal/intent-flow/specs/012-program-api/spec.md`)  
**Plan**: [plan.md](./plan.md) (`/Users/yoyo/Documents/code/personal/intent-flow/specs/012-program-api/plan.md`)  
**Created**: 2025-12-16

本快速指南用于帮助模块作者、平台/适配层作者理解 Process 的定位、安装点语义与迁移落点。

## 1. 你将得到什么

- **统一入口**：用 Process 表达“长效运行 + 跨模块协作”，不再依赖多套并行机制。
- **运行承载不变**：保留现有 `processes` 机制作为唯一运行承载；Process 只是对其语义、安装点与诊断的收敛命名。
- **严格作用域**：Process 只能解析当前安装点作用域内可见的依赖，缺失依赖会失败并给出修复建议。
- **多实例隔离**：实例级 Process 跟随宿主实例生命周期运行，不会串实例。
- **一致语义**：触发模型、并发策略、错误策略在系统层面一致且可测试。
- **可诊断、可解释**：结构化事件可回答“哪个 Process 因何触发，驱动了哪个模块动作”，且默认近零成本。

## 2. 什么时候该用 Process

- **跨模块编排**：把模块 A 的事件转换成模块 B 的动作（不直接写 B 的状态）。
- **后台常驻逻辑**：轮询、心跳、对外订阅、聚合等长期运行行为（但必须遵守事务边界）。
- **平台桥接**：把宿主平台事件（例如挂起/恢复/网络状态）映射为模块动作或流程推进。

## 3. 选择安装点：应用级 / 实例级 / UI 子树级

### 3.1 应用级（全局）

适用于全局 Effects / bootstrap glue：启动一次，随应用运行时启停。优点是写法集中、语义一致；缺点是天然“全局常驻”，不适合 feature 级按需启停。

### 3.2 模块实例级（推荐用于多实例业务）

适用于会话/页面/流程等多实例场景：每个实例独立安装与运行 Process，跨模块协作只发生在各自实例作用域内，避免串实例。

### 3.3 UI 子树级（feature 级）

适用于“只有某个 UI 子树存在时才需要运行”的逻辑：挂载即启、卸载即停，避免把 feature 逻辑做成全局常驻。

## 3.4 Process 公共 API（最小集）

> 说明：本特性不会引入第二套运行承载；对外的 Process API 本质上是对现有 `processes: Effect[]` 的“命名收敛 + 元信息（Static IR）挂载”。运行时侧会消费这些元信息以实现 strict scope、稳定标识与可诊断链路。

- `Process.make(...)`：创建 **Process Definition**（静态面），并把它挂载到一个“冷的长驻 Effect”上；产物仍是 `Effect<void, ...>`，可被安装到 app / instance / subtree 三类作用域。
  - 若未显式提供 `triggers`，默认触发源为 `platformEvent: "runtime:boot"`（启动即触发一次）。
  - 默认 `diagnosticsLevel="off"`（默认近零成本）。
  - `processId` 必须稳定；若未显式提供，仅允许可确定性派生的场景（禁止随机/时间）。
- `Process.link(...)`：跨模块胶水（Link）的推荐入口；产物仍是 `Effect<void, ...>`，但会携带 `kind="link"` 的静态定义信息，便于 runtime/devtools 统一处理。
  - 输入形态与现有 `Link.make({ modules, id? }, ($) => Effect)`一致；
  - 默认 `processId = linkId`（稳定、顺序无关；由参与 modules.id 组合派生）。
  - 默认触发源包含 `platformEvent: "runtime:boot"` 与 `platformEvent: "link:${linkId}"`。
- `Process.getDefinition(...)`：从一个已封装/已安装的 Process Effect 上读取其 **Process Definition**（用于 InternalContracts/Devtools 导出静态装配信息、缺失依赖可修复错误、以及诊断事件打标）；若返回 `undefined`，说明这是“裸 processes”旧形态（或尚未按本特性封装）。

**安装点（scope）不做额外 API**：scope 由“你把它安装到哪里”决定：

- app-scope：放进 root module 的 `implement({ processes: [...] })`，随 Runtime 启停；
- instance-scope：放进某个 `ModuleDef.implement({ processes: [...] })`，随该模块实例启停；
- subtree-scope：通过 React `useProcesses([...])` 安装，随 UI 子树挂载/卸载启停。

**一行示例（降低门槛）**：

- app-scope：`processes: [Process.make("boot", bootEffect), Process.link({ modules: [A, B] as const }, ($) => /* ... */)]`
- 快速迁移/临时写法：仍可直接把 `Effect` 放进 `processes`，但它不具备 `processId/definition`（诊断与导出能力受限），建议尽早替换为 `Process.make/link`。

## 4. 触发与并发策略（最小集）

- **latest**：只处理最新一次触发（旧执行被取消或结果被抑制），适合“只要最终态”的场景。
- **serial**：按触发顺序串行处理，适合必须按序推进的流程；建议显式配置 `maxQueue`。未配置时默认 `unlimited`，但超限护栏默认 failStop 并给出可修复诊断（建议配置 `maxQueue` 或改用 `latest/drop`）。
- **drop**：执行中忽略重入，适合“正在跑就别再触发”的场景；被忽略的触发需可诊断。
- **parallel**：并行处理，适合可并行的独立任务；最大并发必须明确且可诊断。

## 5. 错误策略（默认失败即停）

- 默认策略是 **失败即停**：不做隐式无限重试，避免错误风暴与不可控成本。
- 可选 **受控监督**：允许重启，但必须有明确上限（例如次数/窗口），达到上限后停止，并产生 restart 诊断事件。

## 6. 诊断与 Devtools（Slim & 可序列化）

Process 的诊断事件最少覆盖：start/stop/restart/trigger/dispatch/error，并以稳定标识串起“触发到驱动”的链路；当触发源为模块事件/变化时，trigger 会携带源模块的 `txnSeq`（可派生 `txnId`）以对齐事务聚合。诊断关闭时应接近零成本；开启时必须遵守事件数量与体积预算。

## 7. Process vs StateTrait：边界与选型（避免滥用）

为了避免把 Process 当作“另一套状态派生系统”，这里给出最小选型口径：

- **用 `StateTrait.computed/link`**：当你需要**同步、确定性、可缓存**的状态派生（例如字段依赖图、表单校验/聚合、联动计算），并希望它随事务窗口在 converge/validate 中完成（无 IO）。
- **用 Process**：当你需要**异步副作用/长期运行**（例如 API 请求、轮询、平台事件桥接、跨模块协作），并且要把“触发 → 调度/并发策略 → 跨模块动作驱动”变成可诊断、可监督的一等链路（遵守事务窗口禁 IO）。

经验法则：

- “把状态算出来” → 优先 StateTrait；“因为状态变了要做事（IO/协作）” → Process。
- 如果逻辑的正确性依赖“只要最新/必须按序/避免重入/允许并行”等并发语义 → Process（由系统统一提供并可诊断）。
- 不要用 Process 去维护大块派生 state（会引入额外不确定性与诊断噪声），也不要让 StateTrait 承担 IO（违反事务边界）。

## 8. 迁移说明（无兼容层）

迁移原则：

1. 将历史长效逻辑入口映射为 Process（按安装点归类：应用级/实例级/子树级）。
2. 将跨模块依赖从隐式捕获/全局访问迁移为“作用域内可见依赖 + 动作协议驱动”。
3. 为每个 Process 赋予稳定 `processId`，并确保安装点的 scope 锚点可稳定复现。
4. 为并发/错误策略选择明确默认值，并在需要时显式配置（避免隐式语义）。

迁移完成的验收标准以本特性的 `spec.md` 用户场景（AC-1..AC-7）与成功指标为准。

## 9. SC-003：2 分钟可修复演练（缺失依赖）

目标：当 Process 因“严格作用域缺失依赖”首次运行失败时，开发者能在 2 分钟内根据错误提示完成修复并验证用例通过。

### 9.1 可复现场景（app-scope）

用最小的 Link 复现：Source/Target 两个模块参与同一个 `Process.link(...)`，但 Root 只装配其中一个模块。

参考实现（可直接对照测试用例）：`packages/logix-core/test/Process/Process.AppScope.MissingDependency.test.ts`。

```ts
// 故意只装配 SourceModule，不装配 TargetModule
const RootImpl = RootModule.implement({
  initial: undefined,
  imports: [SourceModule.implement({ initial: undefined }).impl],
  processes: [Proc],
})
```

预期现象：runtime 会产出 `process:error` 事件，且 `error.code === "process::missing_dependency"`；`error.message` 包含缺失的 `moduleId` 列表；`error.hint` 提供可执行修复建议（包含 imports 示例）。

### 9.2 计时标准（如何算“2 分钟”）

- **开始计时**：你第一次在 Devtools/事件流里看到 `process:error (code=process::missing_dependency)`，并能读到 `missing: <TargetModuleId>` 与 hint。
- **结束计时**：完成修复并重新运行后，确认不再出现该错误（且你的 Process/Link 行为按预期运行）。
- **不计入**：首次安装依赖/首次启动开发环境/与本问题无关的排错时间。

### 9.3 修复动作（只允许“补齐作用域内依赖”）

1. 从错误里复制缺失的 `moduleId`（`missing: ...`）。
2. 找到当前 Process 的安装点（本节用 app-scope）：RootModule 的 `implement({ imports, processes })`。
3. 在**同一 scope** 的 `imports` 中补齐缺失模块的 `implement(...).impl`，然后重跑验证。
