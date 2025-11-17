# Quickstart: 升级 Devtools 面板以支持 StateTransaction 与 Trait 生命周期

本特性聚焦在现有 Devtools 面板基础上，补齐「模块 → 实例 → 事务」层级导航以及 Trait 蓝图/setup/run 分层视图。下面是从“如何在本仓验证”的角度给出的快速指引。

## 1. 启动示例应用与 Devtools 面板

1. 在仓库根目录安装依赖并构建：
   - `pnpm install`
   - `pnpm build`
2. 启动包含 Trait 示例的文档站或示例应用（视当前集成方式而定，例如 `pnpm dev --filter apps/docs` 或运行 `examples/logix-react` 对应的 dev 命令）。
3. 在浏览器中打开示例页面，确保 `TraitForm` 等带 Trait 的 Demo 能正常加载，并在界面上显示 Devtools 入口（例如一个可展开的调试面板或侧栏）。

## 2. 在 Devtools 中浏览「模块 → 实例 → 事务」

1. 打开 Devtools 面板，找到左侧导航区域：
   - 顶层应按 Module 维度列出已注册的模块，例如 `TraitFormModule`；
   - 展开某个 Module 后，应看到其下的 Runtime 实例列表（Instance）；
   - 展开某个 Instance 后，应看到最近若干事务（Transaction）条目，例如 `Txn #1234 (action: changeName)`。
2. 点击不同层级，观察中部视图的变化：
   - 选中 Module：中部显示该模块的 TraitGraph（蓝图），不绑定具体实例；
   - 选中 Instance：中部显示叠加了 setup 状态的 TraitGraph，以及按实例过滤的事务列表；
   - 选中 Transaction：中部显示该事务内的事件时间线与字段 Patch 详情。

## 3. 通过 Trait 示例验证状态事务语义（US1）

以 `TraitForm` 示例为例，完整走一遍“一次交互 = 一次事务 = 一次状态提交”的链路：

1. 在 Devtools 左侧选择 `TraitFormModule` 的某个实例。
2. 在页面中聚焦 Name 或 Email 输入框，输入一段文本：
   - Devtools 左侧应出现新的事务条目（如 `Txn #… (action: changeName)`）。
3. 点击该事务条目，观察事务详情：
   - 时间线视图中应展示：
     - 一次 `action:dispatch`（label 约为 `changeName` / `changeEmail`）；
     - 若干 `trait-computed` / `trait-link` 步骤（用于维护 `meta.dirtyCount` / `meta.isDirty`）；
     - 最终一条 `state:update` 事件，表示事务提交；
   - Patch 列表中应只包含与本次输入相关的字段（例如 `form.name`、`meta.dirtyCount`、`meta.isDirty`），而不会包含无关字段；
   - 事务详情中应能看到统一的 `txnId`，同一事务内的 `action` / `trait-*` / `state` / `react-render` 事件都共享这个 `txnId`；
   - 对外状态提交次数应为 **1 次**：
     - 在 RuntimeDebugEventRef 视图中，对于该事务对应的 `txnId`，`kind = "state"` 的事件只有一条；
     - 开发模式下 React 仍可能因为 StrictMode 产生额外渲染，但这些渲染事件应指向同一个 `txnId`，不会改变“单事务 = 单次状态提交”的语义。

> 补充：在测试层你也可以通过 `@logix/test` / `@logix/react` 进行自动化验证：
>
> - 使用 `TestProgram.runProgram(programModule, ...)` 或 React `RuntimeProvider` + `useModule/useDispatch` 驱动一次 `TraitForm` 交互；
> - 通过挂载 DebugSink 并调用 `Logix.Debug.internal.toRuntimeDebugEventRef`，统计某个 `txnId` 下 `kind = "state"` 的事件数应为 1；
> - 断言交互前后 `TraitFormState` 仅在期望字段上发生变化，与 Devtools 中看到的 Patch 聚合结果一致。

## 4. 浏览 Trait 蓝图与生命周期状态

1. 在 Devtools 左侧 Sidebar 中：
   - 在某个 Runtime 下，带有 StateTrait 蓝图的模块会在实例计数旁显示一个 `Trait` 徽标；
   - 若模块存在运行中的实例且已挂载 StateTrait 程序，则该徽标会以高亮样式展示（表示「蓝图 + 运行中」）。
2. 选中带 Trait 的模块与实例后，在右侧 Inspector 的 `Traits / StateTraitGraph` 区块中：
   - 可以看到 StateTraitGraph 的节点列表与依赖边：
     - 节点通常对应某个字段路径（例如 `form.name`、`meta.isDirty`）；
     - 每个节点右侧会展示该字段上挂载的 Trait 类型列表（`computed` / `link` / `source` 等）。
   - Graph 下半部分会展示边列表，例如 `form.name → meta.isDirty (computed)`，用于说明字段间的依赖关系。
3. 在 TraitGraph 中点击某个字段节点（例如 `meta.isDirty` 的 computed）：
   - Devtools 会自动派发一次 `selectFieldPath` 动作，并将当前选中的 `fieldPath` 记录在 DevtoolsState 中；
   - 中部时间线视图会根据该字段路径过滤事件：
     - `state:update` 仅保留该字段值发生变化的帧（以及首帧作为 baseline）；
     - `trace:effectop` 仅保留 meta 中显式标记为该字段的操作；
     - 其他类型事件在字段筛选模式下会被收敛，避免噪音。
   - Inspector 顶部的 TraitGraph 中，对应字段节点会以高亮样式显示，表示当前处于按该字段筛选的状态。
4. 再次点击同一个 Trait 节点：
   - Devtools 会取消字段筛选（`selectedFieldPath` 复位为 undefined），时间线恢复展示该模块下的全部事件；
   - Inspector 右侧的状态视图也会从「按字段过滤的帧」回退到最新状态视图。

## 5. 触发 source 刷新并观察事务

如果某个示例模块引入了 StateTrait.source 字段：

1. 在 TraitGraph 中选中对应的 source 字段节点，或在 Devtools 操作区点击“刷新该字段”按钮。
2. Devtools 应通过 Runtime 的刷新入口触发新事务（origin.kind = "source-refresh"）：
   - 左侧导航出现新的 Transaction 条目；
   - 时间线视图中能看到 service 调用及其结果写回对应字段的 Patch。
3. 若资源访问失败，应在 Patch / 事件详情中看到错误信息，并且字段保留上一次成功值或默认值（符合 traits-runtime 规范）。

## 6. 使用时间旅行调试 Trait 行为

1. 在 Trait 示例中进行多次交互，产生一串 Transaction（例如多次修改表单字段、触发 source 刷新等）。
2. 在 Devtools 左侧选择某个 Instance，并在 Transaction 列表中选中一条事务。
3. 在中部或侧边操作区点击「回到事务前状态」，观察：

- 模块实例的状态被还原到该事务开始前的状态；
- 视图层显示与当时一致；
- Devtools 时间线不会重复播放原事务内部的 EffectOp 事件，也不会重新发起外部请求。

4. 再点击「回到事务后状态」，观察：

- 状态被还原到该事务提交后的最终状态；
- TraitGraph 中对应字段的值与该事务结束时一致；
- Devtools 可以明确标记当前实例处于基于哪个 txnId / mode 的时间旅行状态，并允许用户通过“返回最新状态”恢复到当前实时运行状态。

5. 在事务详情时间线中，尝试点击不同的事件作为当前调试游标：
   - 当某次事务内部有 10 个事件时，选中第 5 个事件后，应看到时间线中第 1–4 个事件以“已执行”样式渲染，第 5 个事件高亮为“当前”，第 6–10 个事件以“未来步骤”样式显示；
   - 顶部或显眼位置应展示类似 `Step 5/10` 的提示，帮助你确认当前所在的调试位置；
   - 在实现了更细粒度回放能力后，可以基于该游标触发“回放到当前步骤之后”的时间旅行，用于排查事务内部某一步骤对状态的具体影响。
6. 观察时间旅行操作在事务列表中的表现：
   - 每次点击时间旅行按钮（回到事务前/后或返回最新状态）后，Devtools 左侧的 Transaction 列表中应新增一条特殊事务条目，其 origin.kind 为 `"devtools"`（在 UI 中可通过标签或样式区分），对应的 `state:update` 事件的 `meta.originKind` 也会标记为 `"devtools"`；
   - 这些 devtools 事务会像普通事务一样在 Runtime 中提交一次状态，但不会重复触发外部副作用（例如不会重新发起 HTTP 请求），其主要目的是在事务时间线中留下完整的 time-travel 轨迹，便于后续审计与回放。

## 7. 在 Timeline 中观察组件渲染事件

1. 确保示例应用在 Dev 模式下启用 Devtools 对 RuntimeDebugEvent 的订阅（通常通过 `devtoolsLayer` 或等价配置）。
2. 打开带 Trait 的表单示例（如 `TraitForm`），在输入框中缓慢输入几次文本，产生多条 StateTransaction。
3. 在 Devtools 中选中某个事务，观察时间线：
   - 除了 `action` / `trait-*` / `state` 等事件外，应看到若干 **`kind = "react-render"`** 的事件条目；
   - 在当前实现中，这类事件在 Timeline 中的 `type` 通常显示为 `trace:react-render`，颜色偏黄（View），用于与其他事件类型区分；
   - 这些渲染事件的 RuntimeDebugEventRef.meta 中应携带 `componentLabel` / `selectorKey` 或关键字段路径，并在由该事务提交触发时带有相同的 `txnId`，使你可以直接判断“一次事务导致了哪些组件渲染”。
4. 尝试在 Devtools 中按事件类别过滤/折叠视图：
   - 使用 Timeline 头部的 kind 过滤按钮将视图切换到 `View`，此时只保留 `kind = "react-render"` 的渲染事件；
   - 也可以在 settings 中切换观测模式（例如从 `"deep"` 切到 `"basic"`）或关闭 `showReactRenderEvents`，以在高噪音场景下暂时折叠渲染事件；
   - 结合 `state` / `action` 事件一起查看，可以分析在 Trait 数量增加后，单次交互对应的渲染次数与字段更新范围是否仍然在可接受范围内。

## 8. 使用时间轴总览条与模式切换分析性能

1. 在 Dev 模式下打开带 Trait 的 Demo 页面（如 `TraitForm` 或后续的 `trait-txn-devtools-demo` 页面），确保 Devtools 面板已挂载。
2. 观察 Devtools 顶部的时间轴总览条（overview strip）：
   - 条形/面积图应按时间轴展示最近一段时间内的事务密度和组件渲染密度；
   - 不同强度区域可能通过颜色（如绿/黄/红）或背景带区分表示“正常 / 接近阈值 / 超过阈值”。
3. 使用鼠标在 overview strip 上拖拽选择一段时间区间：
   - 下面的 Transaction 列表与事件时间线应自动过滤到该区间内发生的事务与事件；
   - 通过缩放/移动选择区域，可以快速定位某一段“特别吵”的时间片段，并聚焦分析其中的事务与渲染。
4. 切换 Devtools 观测模式（例如从 `"basic"` 切到 `"deep"`）：
   - 在 `"basic"` 模式下，应只看到 action/state/service 事件与粗粒度 `react-render` 事件，Trait 细节和时间旅行 UI 被隐藏，以降低噪音；
   - 切换到 `"deep"` 模式后，应额外看到 trait-\* 事件与时间旅行按钮，同时 overview strip 可能展示更多维度的指标；
   - 切换模式时，Runtime / Debug 层应减少当前模式不需要的 Debug 事件与统计工作（例如在 `"basic"` + `"light"` 下只对 `react-render` 做采样埋点），你可以在高 Trait 密度场景下观察模式切换对 Devtools 自身开销的影响。
5. 在高频输入场景（如快速输入表单字段）和低频操作场景（如间隔点击按钮）下，对比 overview strip 的形态与颜色变化，判断当前模块是否接近或超过预设性能阈值；如某段时间显著偏红，可结合事务视图和渲染事件进一步分析是否需要引入中间件防抖/节流或调整 Trait 粒度。

## 9. 最小质量自检

在完成本特性实现后，建议至少执行：

1. 类型与基础质量：
   - `pnpm typecheck`
   - `pnpm lint`
2. 运行时与 React 层测试：
   - `pnpm test --filter @logix/core`
   - `pnpm test --filter @logix/react`
   - （如有）`pnpm test --filter @logix/devtools-react`
3. 手工验证：
   - 打开带 Trait 的 Demo，确认：
     - 左侧可以从 Module → Instance → Transaction 逐级导航；
     - TraitGraph 能正确反映蓝图与 setup 状态；
     - 单次用户交互引出的事务数量合理，事务内 Patch 与事件轨迹可读、可用；
     - 在 Devtools 中选中任意事务执行时间旅行操作（回到事务前/后），状态与视图表现符合预期，且不会重复触发外部副作用；
     - 在包含较多 Trait 节点的示例模块中，简单体验“一次输入/点击”的响应速度：在本地 dev 环境下，单次交互对应的事务执行应无明显卡顿，React 渲染次数大致不超过 3 次（StrictMode 双调用除外），作为性能调优与自检的参考；
     - 在开启/关闭 Devtools、在 `"basic"` / `"deep"` 模式、以及在 `"full"` / `"light"` 观测策略组合下，对比 overview strip 的事件密度与预警颜色变化，确认观测策略与模式切换不会破坏事务语义，只影响观测成本与噪音。
