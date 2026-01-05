# Data Model: ReadQuery.createSelector

本特性属于“读依赖表达（reads）/Static IR”的增强，不引入业务数据模型；仅新增/固化若干运行时类型与约束。

## 现有核心类型（SSoT：代码类型为准）

- `ReadQuery<S, V>`：用户可传入的“读查询”描述（必须包含 `selectorId/reads/select/equalsKind`）。
- `ReadQueryCompiled<S, V>`：`ReadQuery.compile` 的产物（新增 `lane/producer/readsDigest/fallbackReason/staticIr`）。
- `ReadQueryStaticIr`：最小 Static IR（selectorId、lane、producer、reads、readsDigest、equalsKind…）。
- `ReadsDigest`：`{ count, hash }`，来自对归一化 reads 的稳定摘要（fnv1a32 + stableStringify）。

## createSelector 的契约模型（新增）

### 输入

- `inputs`: `ReadonlyArray<ReadQueryInput<S, any>>`
  - 每个元素会先经过 `ReadQuery.compile` 归一化；
  - 默认要求每个输入都是 **static lane** 且 `readsDigest` 存在（否则 fail-fast）。
- `result`: `(...values) => V`：结果组合函数（允许做派生计算）。
- `debugKey`: `string`：用于 selectorId 计算与诊断定位（建议稳定、可读、唯一）。
- `params?`: `unknown`：可选的稳定参数（通过 stableStringify 编入 selectorId），用于显式区分闭包参数（例如阈值、模式开关）。
- `equalsKind? / equals?`：输出的 equals 策略（影响 SelectorGraph 的通知抑制）。

### 输出

输出是一个 `ReadQuery<S, V>`（manual 静态 ReadQuery）：

- `selectorId`: 确定性计算，不允许随机/时间默认；
- `reads`: `union(inputs.reads)`（归一化去重排序）；
- `select(state)`: 先计算 inputs 的值，再调用 `result(...values)`；
- `equalsKind/equals`: 使用调用方指定或默认值。

之后在任何消费侧（`useSelector` / ModuleRuntime selector graph 等）仍走统一入口：

- `ReadQuery.compile(output)` → `ReadQueryCompiled`（lane=static，producer=manual，readsDigest 必须存在）

## Failure / Violation Model

默认 fail-fast 条件（避免“看似 static 但 deps 不完整”）：

- 任一输入编译为 dynamic lane；
- 任一输入缺失 `readsDigest`（等价于 reads 为空或不可识别 deps）。

错误信息至少需要携带：

- output 的 `debugKey`（createSelector 的 debugKey）
- 触发失败的 input `selectorId`
- input 的 `fallbackReason`（当输入来自函数编译且进入 dynamic lane 时）

