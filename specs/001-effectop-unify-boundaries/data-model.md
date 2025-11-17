# Data Model: 001-effectop-unify-boundaries

**Feature**: `/Users/yoyo/Documents/code/personal/intent-flow/specs/001-effectop-unify-boundaries/spec.md`  
**Date**: 2025-12-12

> 说明：本特性的数据模型用于约束“边界操作统一总线”的结构化上下文，供 middleware 做观测/运行策略/守卫决策使用。

## Entity: Operation（边界操作）

表示一次可被 middleware 管线处理的执行单元。

### Fields（概念字段）

- **id**: 操作实例 id（用于区分同类操作的不同执行实例）
- **kind**: 边界类别（必须覆盖当前所有既有类别，包含内部与调试类边界）
- **name**: 操作名（用于定位与观测聚合）
- **payload**: 输入或上下文（可选）
- **meta**: Operation Meta（见下）
- **effect**: 实际要执行的程序（实现细节，不在 spec 层约束其形态）

### Invariants（不变量）

- 每次边界执行必须先构造 Operation，并进入统一 middleware 管线。
- 若 middleware stack 为空，Operation 必须以直通模式执行（不改变行为）。

## Entity: Operation Meta（操作上下文）

用于中间件决策与观测关联的结构化元信息。

### Required

- **linkId**: 操作链路 id（强制；同一链路下的多步操作必须共享该值）

### Strongly Recommended（由 Runtime 自动补齐为主）

- **moduleId**: 来源模块 id（若存在模块语义）
- **instanceId**: 模块实例锚点（用于区分多实例；禁止默认随机/时间）
- **runtimeLabel**: 人类可读的 runtime 标签（便于观测）
- **txnId**: 事务 id（若运行时存在事务语义）
- **trace**: 追踪标签数组（供 Devtools/Observer 使用）

### Optional（由调用方/局部标注提供）

- **tags**: 字符串标签（用于简单筛选/聚合）
- **policy**: 局部策略标注（见下）
- **debug**: 调试相关字段（不影响业务语义，仅供观测）
- **[k: string]**: 预留扩展位（需谨慎使用；新增字段应优先形成规范）

### Invariants（不变量）

- linkId 必须存在；且边界起点创建新 linkId，嵌套操作复用当前 linkId。
- 全局守卫不可被局部关闭（见 Policy Annotation 规则）。

## Entity: Local Policy Annotation（局部策略标注）

描述“这次操作希望中间件如何对待它”的意图，仅用于中间件决策，不携带具体规则逻辑。

### Fields（概念字段）

- **allow**: 允许的策略标签/组（可选）
- **deny**: 禁止的策略标签/组（可选）
- **disableObservers**: 是否禁用纯观测能力（可选）
- **tighten**: 收紧约束的标注（可选）

### Precedence Rules（优先级规则）

- 局部策略不得关闭全局守卫；
- 局部策略仅允许：追加信息、收紧约束、关闭纯观测能力；
- 若发生冲突，以“更严格/更安全”的结果为准（可观测上必须可解释）。

## Entity: Rejected Error（显式拒绝失败）

守卫拒绝执行时的统一失败结果。

### Required Semantics

- 对调用方表现为失败（可与成功区分）；
- 不产生任何业务副作用（拒绝发生在用户程序执行前）；
- 可被观测与聚合（至少包含可识别的原因/来源信息）。

## Entity: Middleware（中间件）

对 Operation 的可组合处理逻辑。语义角色分为：

- **Observer**: 仅观测，不改变业务语义；
- **Runner**: 调整运行策略（例如重试/超时/并发），但保持单次语义等价；
- **Guard**: 准入控制（允许/拒绝）。

### Invariants（不变量）

- 总线是唯一挂载点：任何 Observer/Runner/Guard 都必须通过 middleware 管线生效。
- Guard 的拒绝必须产出“显式拒绝失败”，且无副作用。
