# 6. 自上而下的资产分层与复用视角

为了在平台化与资产复用阶段保持一致的语言，本节从“自上而下”的角度给出资产分层视图，补充前文从运行时/实现角度给出的分类。

可以粗略将资产分为四个层级，对应从“业务需求”到“运行时代码”的渐进演化：

## 6.1 Level 0：业务需求资产（Business Requirement）

- 形态：需求文档 / 用户故事 / PRD 片段，通常记述为“当 X 发生，若满足 Y，则系统应 Z”。
- 资产示例：
  - 搜索结果第一条应在右侧详情展示；
  - 审批通过时记录审计日志并刷新待办列表；
  - 用户切换国家时清空省份和城市。
- 复用方式：
  - 通过「需求模板 / 用例库」复用：为常见业务场景提供结构化的描述模板，便于在新项目中快速“叫出”类似需求；
  - 在平台侧，与 `IntentSpec` 的顶层字段（`ui / logic / domain / constraints`）对齐。

## 6.2 Level 1：需求意图资产（Requirement Intent / Use Case Blueprint）

- 形态：将 Level 0 的自然语言需求投影到三维 Intent 模型与 Logic Intent Graph 上，形成“用例级蓝图”：
  - 明确涉及哪些 UI/Interaction 节点、哪些 Module 实体/字段、哪些 Logic 步骤；
  - 使用较粗粒度的 `IntentRule` 集合作为内部表示（source/sink 已绑定模块/字段，但 pipeline 可以暂留自然语言注释）。
- 资产示例：
  - “搜索-详情联动蓝图”：一组从 Search.State/Action 到 Detail.Action 的规则；
  - “审批流蓝图”：一组从 UI 交互到 Service 调用与状态更新的规则。
- 复用方式：
  - 在平台 Galaxy 视图上作为“用例模板”出现，通过参数（模块 ID、字段路径、策略选项）应用到具体项目；
  - 为 Level 2 的开发意图提供约束与参考，不直接决定具体 API 形态。

## 6.3 Level 2：开发意图资产（Developer Intent）

- 形态：在 Level 1 蓝图的基础上，落到具体的 Module / Pattern / Intent API 选择上：
  - 确定使用哪些 Logix.ModuleShape / Logic / Spec 模块；
  - 为每条规则选择对应的表现形式：
    - L1：单 Store 内同步联动 —— 代码侧推荐使用 Fluent DSL（`$.onState / $.onAction + $.state.update/mutate`），在 IR 中映射为 L1 IntentRule；
    - L2：跨 Store 协作 —— 代码侧推荐使用 Fluent DSL（`$.use(StoreSpec) + Fluent DSL（$Other.changes/… → $SelfOrOther.dispatch）`），在 IR 中映射为 L2 IntentRule（Coordinate）；
    - L3：复杂 Flow/Pattern 组合 —— 直接使用 `Flow.*` / Pattern / Effect 组合，平台视为部分可解析或 Gray/Black Box；
  - 形成结构化、可出码的 `IntentRule` 集合。
 - 资产类型：
  - **Pattern 资产**：`(input) => Effect` 行为积木，配有 `configSchema` 与 meta，可在多个模块/项目中复用；
  - **Logic 模板**：针对某一类场景的 Logic 程序值（如标准搜索场景 Logic），适合在一个产品线内部复用；
  - **Module 模板**：包含特定 State/Action 形状与一组 Logic 的“模块级模板”（如标准分页列表 Module）；
  - **IntentRule 集合**：一个模块内或跨模块的完整规则表。
- 复用方式：
  - Pattern 与 IntentRule 集合是平台化的首选资产，适合在团队/多项目间共享；
  - Logic/Store 模板更像是“中层模板”，适合在单项目或单条产品线内复用，并在实践验证后逐步提炼出更通用的 Pattern/Blueprint。

## 6.4 Level 3：实现资产（Implementation / Code）

- 形态：具体项目中的 Module / Logic / Pattern / UI 代码与运行时配置：
  - 类型安全的 State/Action Schema、`Logix.Module.make('Id', { state, actions })`（返回 ModuleDef）与对应的 `ModuleDef.logic(($) => Effect.gen(...))` 调用；
  - Logic 程序中的 `Effect.gen` 逻辑，结合 Fluent DSL（`$.onState` / `$.onAction` / `$.on`）/ Flow / 结构化控制流，IR 层统一使用 `IntentRule` 表达语义；
  - Pattern 实现文件、测试用例与 React 绑定代码。
- 复用方式：
  - 以普通工程方式拷贝/改造；
  - 更推荐在日常开发中“从 Level 3 反向提炼出 Level 2/1 资产”：
    - 将经常被 Copy 的行为逻辑提炼为 Pattern；
    - 将稳定的模块协作关系提炼为 Use Case Blueprint 与 IntentRule 集合；
    - 将高频需求表述方式归档为 Level 0 的需求模板。

## 6.5 平台化时的关注重点

在规划平台与资产复用时，可按照层级决定“优先平台化的对象”：

- **优先级 1：Pattern + IntentRule 集合（Level 2）**
  - 这是「开发意图」层的主力资产，既与运行时代码紧密相关，又足够抽象、易于配置。
- **优先级 2：Use Case Blueprint（Level 1）**
  - 面向 PM/架构师的“业务用例蓝图”，适合在 Galaxy 视图中作为起点，通过参数化派生多个项目内的实现。
- **优先级 3：Logic/Store 模板（Level 2 / 3 之间）**
  - 更适合作为某条产品线内部的模板，经过实际项目打磨后，再考虑部分内容上升为 Pattern/Blueprint。
- **Level 0 模板**
  - 用于支撑从需求文档到 IntentSpec 的结构化录入，属于平台 UX 层面的建设，不直接参与运行时代码生成。

本节视图不是对前文资产分类的替代，而是从“业务需求 → 意图 → 实现”的链路出发，为后续平台化与资产运营提供一个统一的参照维度。***
