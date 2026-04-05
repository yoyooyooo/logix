# 5. 微观沙箱：最小特权上下文

为了降低幻觉和误用依赖的风险，平台向 Agent 注入的上下文必须遵守**最小特权原则**。

## 5.1 必须注入的内容

针对单个 Logic 文件（通常对应某个 `ModuleDef.logic(($)=>...)`）：

- 当前 Module 的定义与 Schema 投影：
  - Module 标识（Id）、State/Action Schema 片段（字段名与类型，而非全部实现）；
  - 已存在的 Logic 代码片段（便于 Agent 做增量修改）。
- 已声明的依赖与一跳邻居：
  - 当前 Logic 中出现的 `yield* $.use(ModuleOrService)` 调用列表；
  - 与这些 Module / Service 在 IntentRule 拓扑上直接相连的一跳邻居（便于处理常见 L2 协作）。
- Bound API 与 Fluent 子集说明：
  - `$` 的类型签名片段：`state` / `actions` / `flow` / `control` / `use` 等方法名称与参数形状；
  - 1–2 个官方 Fluent 示例，作为风格与约束的示例代码。

## 5.2 明确禁止注入的内容

- 与当前 Logic 在 Module / IR 上**无直接关系**的其他业务域 Module / Service；
- 大体量实现细节：完整 Service 实现、长算法、非本场景的 Logic 文件；
- Runtime 内核细节：Tag / Context / Layer 组合实现等（对 Agent 来说视为黑盒）。

> Agent 侧额外约束：
> 只能对「Available Stores/Services」列表中的实体调用 `$.use`，不得凭空创造新的名称；
> 如需要能力不在列表中，应报告“当前沙箱不可用”，而不是编造模块。
