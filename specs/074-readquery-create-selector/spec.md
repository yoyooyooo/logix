# Feature Specification: ReadQuery.createSelector（reselect 风格组合器，显式 deps 的静态选择器组合）

**Feature Branch**: `074-readquery-create-selector`  
**Created**: 2026-01-05  
**Status**: Draft  
**Input**: 用户问题收敛：proxy-memoize/reselect 是否有用？如何做 reselect 风格 ReadQuery 组合器？ReadQuery 是否会因闭包退化为 dirtyAll？`reads` 是什么？（并与 073 topic 分片订阅相交）

## Context

当前 `ReadQuery.compile` 已支持把一小部分 selector（单一路径、浅 struct、或显式 `fieldPaths`）编译为 **static lane**，并产出 `selectorId/reads/readsDigest` 供 `SelectorGraph` 做 dirty-check 与缓存。

但在真实业务里，常见写法是“组合多个 selector + 做一次派生计算”，例如：

- UI ViewModel：多个字段拼装、格式化、权限判断；
- query/source key 计算：多输入合并为稳定 key；
- 组合器复用：想像 reselect 那样把“输入选择 + 结果组合”抽象出来。

在这些场景里，如果用户直接写闭包/复杂语法（条件/解构/临时变量/动态索引），`ReadQuery.compile` 往往会退化到 **dynamic lane**（`reads=[]`），导致：

- 依赖不可识别 → `SelectorGraph` 每次 commit 都会评估（等价 dirtyAll 级成本），即使最终 equals 抑制了通知；
- `selectorId` 可能因为 `unstableSelectorId` 变为运行期序号（`rq_u*`），难以作为 IR/诊断锚点；
- 073 的 “topic 分片订阅（按 moduleKey/readsDigest）” 无法充分受益：inputs 退化 dynamic 时缺少 `readsDigest`，只能回退到粗粒度 topic。

因此需要一个“显式 deps 的组合器”，让用户用 **声明式输入列表** 组合出一个新的 ReadQuery，并保证它仍处于 static lane。

## Goals / Scope

### In Scope

- 提供 `ReadQuery.createSelector`（reselect 心智）：
  - **输入**：多个 **静态** ReadQuery（或可静态编译的 selector）；
  - **输出**：一个新的 ReadQuery（static lane），其 `reads = union(inputs.reads)`，并有稳定的 `readsDigest`；
  - 结果函数（`result`）可做派生计算；可配置 `equalsKind`（默认 `objectIs`，支持 `shallowStruct/custom`）。
- **硬口径**：当任一输入无法静态编译（dynamic lane 或缺失 readsDigest）时，默认 **fail-fast**，禁止产出“看似 static 但 deps 不完整”的选择器（避免隐蔽的 stale bug）。
- 作为公共 API 暴露给用户（也允许内部复用），用于把“声明式 deps”从文档建议升级为可复用工具。

### Out of Scope

- proxy-memoize（Proxy 追踪 property access）式的动态依赖推断：它不产生可导出/可比对的 Static IR，且与 `057-core-ng-static-deps-without-proxy` 的方向冲突。
- 自动解决“参数化 selector”（如 `selectById(id)`）的静态化：这类 selector 的依赖随参数变化，除非显式把参数纳入 deps/IR，否则只能保持 dynamic 或选择更粗粒度 deps（另开需求）。
- 引入外部库依赖（reselect/proxy-memoize）：本特性只采纳其心智模型，不引入第三方实现。

## Terminology

- **reads**：选择器的显式依赖列表（字段路径集合）。用于 dirty-check：当 dirtySet 与 reads 无交集时可跳过评估。
- **readsDigest**：对归一化 reads 的稳定摘要（`count/hash`），用于快速分片、诊断锚点与 IR 编码。
- **static lane**：ReadQuery 有可识别依赖（readsDigest）且 selectorId 稳定（非 `rq_u*`）的路径。
- **dynamic lane**：ReadQuery 依赖不可识别（`reads=[]`），每次 commit 都可能需要评估。

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 组合静态 ViewModel（Priority: P1）

业务开发者希望把多个静态 selector 组合成一个 ViewModel selector，并保持依赖可识别与性能可控。

**Why this priority**：这是最常见、最直接能减少 dynamic lane 的路径。

**Independent Test**：单测中对 `createSelector` 产出的 ReadQuery 断言 `lane=static`、`readsDigest` 存在且等于 inputs 的 union 摘要；并验证 `SelectorGraph` 在无交集 dirtySet 下不会评估该 selector。

**Acceptance Scenarios**：

1. **Given** 两个 static ReadQuery（reads 分别为 `['user']` 与 `['flags']`），**When** `createSelector` 组合出 ViewModel，**Then** 新 selector 的 reads 为 union 且 `readsDigest.count==2`，并可在 SelectorGraph 中按 rootKey 索引。
2. **Given** dirtySet 只包含 `['unrelated']`，**When** commit，**Then** 该 selector 不被评估（无 `trace:selector:eval` 或 changed=false 且 eval 不发生，按测试实现口径）。

---

### User Story 2 - 作为 073 topic 分片的输入基础（Priority: P2）

平台/运行时开发者希望用户“主动声明 deps”时能稳定产出 `readsDigest`，使 073 的 topic 分片订阅能更细粒度而无需依赖闭包解析。

**Why this priority**：这是 073 的性能/诊断路径上最容易“错过的交叉点”，但应通过独立 074 先把 API 契约稳定住。

**Independent Test**：仅测试 `createSelector` 输出的 `ReadQueryStaticIr` 字段完整（selectorId/reads/readsDigest/equalsKind），并可被下游系统按 `readsDigest` 分片。

---

### User Story 3 - Fail-fast 防止伪静态（Priority: P3）

开发者不希望因为某个输入 selector 退化 dynamic 而悄悄产生 stale 或性能灾难，希望组合器默认直接报错。

**Why this priority**：这是“硬优化”的关键：宁可显式失败，也不要隐性退化。

**Independent Test**：当任一输入编译为 dynamic lane（或 readsDigest 缺失）时，`createSelector` 抛错并包含可定位信息（debugKey/selectorId/fallbackReason）。

### Edge Cases

- 输入 selector 是 dynamic lane（closure/动态索引/unsupported syntax）。
- 输入 selector 的 `reads` 为空或 `readsDigest` 缺失（疑似伪静态）。
- 输入 reads 有重叠/前缀关系（union 后仍需归一化去重排序）。
- resultFn 抛错时的诊断语义（保持与现有 `read_query::eval_error` 一致）。

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: 系统 MUST 提供公共 API `ReadQuery.createSelector`（`@logixjs/core` 子模块 `ReadQuery`）。
- **FR-002**: `createSelector` MUST 先对 inputs 调用 `ReadQuery.compile`，并在任一输入进入 dynamic lane 或缺失 `readsDigest` 时 fail-fast（默认）。
- **FR-003**: 对于所有 inputs 为 static 的情况，`createSelector` MUST 产出一个新的 ReadQuery，且：
  - `reads = union(inputs.reads)`（归一化去重排序）；
  - `selectorId` 稳定且确定性（不得使用随机/时间默认；不得落入 `rq_u*`）；
  - `equalsKind` 可配置（默认 `objectIs`）。
- **FR-004**: 产出的 ReadQuery MUST 能被 `ReadQuery.compile` 视为 manual static，并产出 `ReadQueryStaticIr`（lane=static、producer=manual、readsDigest 存在）。

### Non-Functional Requirements (Performance & Diagnosability)

- **NFR-001**: 本特性不应改变 SelectorGraph 的评估策略与复杂度；新增逻辑仅在 selector 定义阶段发生（`createSelector` 调用期），并保持 O(sum(reads))。
- **NFR-002**: selectorId/readsDigest MUST 去随机化：仅由稳定输入（inputs 的 selectorId/readsDigest + debugKey + 可选 params）计算。
- **NFR-003**: Fail-fast 错误 MUST 可诊断：至少包含 `debugKey`、inputs 中触发失败的 `selectorId` 与 `fallbackReason`。

### Key Entities _(include if feature involves data)_

- **ReadQuery**：对状态读取的协议化描述（selectorId/reads/equals）。
- **ReadQueryStaticIr**：Static IR 子集（用于下游分片/诊断/导出）。
- **ReadsDigest**：reads 的稳定摘要（count/hash）。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 组合器产出的 ReadQuery 进入 static lane，且 `readsDigest` 与 union(reads) 一致（单测可断言）。
- **SC-002**: 当 inputs 退化 dynamic 时，`createSelector` 以 fail-fast 阻止“伪静态”输出（单测可断言错误字段）。
- **SC-003**: 不引入第三方依赖与 Proxy 路径（代码审查 + package.json 不变）。
