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

## 3. 通过 Trait 示例验证状态事务语义

以 `TraitForm` 示例为例：

1. 在 Devtools 左侧选择 `TraitFormModule` 的某个实例。  
2. 在页面中聚焦 Name 或 Email 输入框，输入一段文本：
   - Devtools 左侧应出现新的事务条目（如 `Txn #… (action: changeName)`）。
3. 点击该事务条目：
   - 时间线视图中应展示：一次 action:dispatch、若干 trait-computed / trait-link 步骤，以及最终的 state:update；
   - Patch 列表中应只包含与本次输入相关的字段（例如 `form.name`、`meta.dirtyCount`、`meta.isDirty`）；
   - 对外状态提交次数应为 1 次（开发模式下 React 仍可能因 StrictMode 出现 2 次 render，但对应同一事务）。

## 4. 浏览 Trait 蓝图与生命周期状态

1. 在 Devtools 中切换到 TraitGraph 视图：
   - 节点上应标记出蓝图层的 Trait（computed / link / source 等）；
   - 对于当前实例，节点样式或标记应反映 setup 状态（已接线 / 未接线 / error）。
2. 在 TraitGraph 中点击某个 Trait 节点（例如 `meta.isDirty` 的 computed）：
   - 右侧或下方详情区域应展示该 Trait 的蓝图信息（依赖字段、配置等）；
   - 时间线视图应过滤或高亮最近若干涉及该 Trait 的事务和事件。

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

## 7. 在 Timeline 中观察组件渲染事件

1. 确保示例应用在 Dev 模式下启用 Devtools 对 RuntimeDebugEvent 的订阅（通常通过 `devtoolsLayer` 或等价配置）。  
2. 打开带 Trait 的表单示例（如 `TraitForm`），在输入框中缓慢输入几次文本，产生多条 StateTransaction。  
3. 在 Devtools 中选中某个事务，观察时间线：  
   - 除了 `action` / `trait-*` / `state` 等事件外，应看到若干 `kind = "react-render"` 的事件条目，label 类似 `"react: TraitForm render"`；  
   - 这些渲染事件应携带 `componentLabel` / `selectorKey` 或关键字段路径，并在由该事务提交触发时带有相同的 `txnId`，使你可以直接判断“一次事务导致了哪些组件渲染”。  
4. 尝试在 Devtools 中按事件类别过滤/折叠视图（例如只保留 `react-render` + `state`），以分析在 Trait 数量增加后，单次交互对应的渲染次数与字段更新范围是否仍然在可接受范围内。  

## 8. 最小质量自检

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
     - 在 Devtools 中选中任意事务执行时间旅行操作（回到事务前/后），状态与视图表现符合预期，且不会重复触发外部副作用。
