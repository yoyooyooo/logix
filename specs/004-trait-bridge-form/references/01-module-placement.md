# References: 领域放置决策（Form vs 独立领域包 vs Module+Logic 最佳实践）

> 目标：把“可编辑表格 / 规则配置器 / 动态表单引擎 / 任务编排面板 / 实时搜索联动”等真实 ToB 场景映射到我们的链路：  
> **Trait（内核）→（可选）StateTrait（支点）→ 领域包（Form/Query/…）→ UI 适配层**，用于压力测试 004 的假设，避免“为了 Form 假设一个不存在的世界”。

---

## 1. 三种产物形态（先定边界）

### 1.1 `@logixjs/core`（Trait kernel）

如果一个能力满足以下任意一条，就应该下沉到 kernel：

- **可回放链路的必要基础设施**：Ref（可序列化定位）、scoped validate/execute、cleanup 语义、Graph/Plan 推导；
- **跨领域复用概率极高**：不仅 Form，Query、Grid、Builder、Workflow 都会用到；
- **不携带领域话术**：不出现“字段/表单/提交”等语义也说得通。

在 004 的语境里：`StateTrait.*` 与 `TraitLifecycle.*` 是 kernel 归属。

### 1.2 `@logixjs/form`（领域包：Form）

如果一个能力满足以下全部/大部分特征，它属于 Form：

- **核心对象是“可提交的草稿（draft）”**：有“提交/保存/回填/重置”这一类生命周期；
- **错误主要以“字段错误/行错误/列表错误”呈现**：用户需要把错误稳定映射到输入控件；
- **交互态心智明确**：touched/dirty/submitCount 等（并且这些状态进入 `state.ui` 作为事实源）；
- **迁移对标对象存在**：RHF / antd form / 内部表单体系；需要写法映射规则。

`@logixjs/form` 的定位应是“**领域糖 + helper + 最佳实践协议**”，不是第二套运行时。

### 1.3 独立领域包（非 Form）

当领域的主心智不是“提交草稿”，而是另一类主模型时，应该抽成独立领域包（仍复用 kernel）：

- Query / Search：主语是“查询、缓存、竞态、分页、聚合、facet”
- Workflow / Task：主语是“任务状态机、重试/取消、进度、队列”
- Builder：主语是“结构化表达式（AST）、约束、解释、可视化”
- Grid：主语是“二维交互、批量编辑、粘贴、排序/筛选/分页”

这些包可以采用“像 Form 一样”的形状（Ref + scoped execute + cleanup + UI 双工状态），但**不应把语义硬塞进 Form**。

### 1.4 只给最佳实践（暂不出包）

以下情况更适合先写“Module + Logic 的最佳实践/模板”，而不是发新包：

- 能力很薄、复用边界不清晰；
- 还在探索真实需求，DSL 很可能推翻；
- 只是在某个行业/业务线出现一次，短期不值得固化成公共 API。

---

## 2. 放置判别框架（Occam 版）

把一个“看起来像 Form 的领域”过一遍下面这组问题即可定位：

### 2.1 这是不是“可提交草稿”？

- **是** → 倾向 `@logixjs/form`（或 `@logixjs/form-*` 上层扩展）
- **否** → 倾向独立领域包（Query/Workflow/Builder/Grid…）

### 2.2 错误模型是否以“字段级定位”作为主要交互？

- **是** → 复用 004 的 ErrorTree / FieldRef 能力（但未必属于 Form）
- **否** → 可能需要另一套“诊断/解释”模型（例如任务失败原因、查询失败原因、表达式不可满足）

### 2.3 交互态（ui）是否需要进入全双工可回放链路？

如果 UI 状态满足下面任一条，就应该进入 `state.ui`（仍由对应领域包维护）：

- 需要 time travel 重放（复现操作轨迹、定位 bug）；
- 需要 Devtools 解释“为什么现在被禁用/隐藏/不可点击”；
- 需要生成/回放脚本（录制回放、端到端自动化）。

### 2.4 Ref 的“身份锚点”是什么？

004 目前以 **path + listIndexPath/index** 为核心锚点（与 RHF 对齐）。但压力测试时需要辨别：

- **index 身份足够**：Form / 可编辑表格（多数场景） / facet 列表（多数场景）
- **需要稳定 identity**：表达式 AST 节点、工作流节点、队列任务（重排/过滤不应改变身份）

如果必须稳定 identity，说明：
- 仍然可以复用 `TraitLifecycle` 的“桥接模式”，但 Ref 的形状可能需要扩展（例如允许 `id` 锚点）；
- 这通常意味着“独立领域包”，而不是塞进 Form。

---

## 3. 典型领域的推荐归属（压力测试矩阵）

> 结论先行：**Form 不是“超级类库”**。我们要把“通用桥接能力”下沉到 TraitLifecycle，把“领域语义”留在各自领域包里。

| 领域 | 主心智 | 是否属于 Form？ | 推荐落点 | 对 004 的压力点 |
|------|--------|------------------|----------|------------------|
| 可编辑表格（Editable Grid） | 二维交互 + 批量编辑 | 不直接属于；更像 Form 的 UI 超集 | `@logixjs/form` 作为内核 + 上层 `@logixjs/grid`（或先最佳实践） | list.list 校验、批量粘贴触发 source 风暴、竞态策略、局部校验性能 |
| 规则配置器 / 条件构建器（Builder） | AST 编辑 + 约束 + 解释 | 否 | 独立 `@logixjs/builder`（或 `@logixjs/rules`） | 嵌套 list（多层）、Ref 是否需要稳定 id、错误定位与可解释性（不是“字段错误”） |
| 动态表单引擎（Schema-driven Form Engine） | 远端 schema → 渲染器 | 属于 Form 生态，但不是 Form 本体 | `@logixjs/form-engine`（构建在 `@logixjs/form` 之上） | 蓝图（schema）与实例（state）的边界；Schema transform 双向映射；运行时资源装配 |
| 任务编排/队列面板（Task Runner / Queue） | 状态机 + 进度 + 重试/取消 | 否 | 独立 `@logixjs/task` / `@logixjs/workflow` | source 的并发/取消语义、时间线可解释性、Ref 是否稳定（按任务 id） |
| 实时搜索 + 结果联动（Search/Facet + Detail） | 查询/缓存/竞态 | 否 | 独立 `@logixjs/query`（基于 Resource/EffectOp） | keyHash、switch/exhaust、去抖/节流、全双工 UI 状态（loading/error/selected facets） |

---

## 4. 与 004 主线的对齐方式（“同源形状”而非“都叫 Form”）

我们追求的是：未来 `xxxTrait` 也能“像 Form 一样好用”，但不是让所有领域都落进 Form。

建议的统一点（跨领域可复用）：

1) **TraitLifecycle（桥接模式）**  
   - install：把领域事件（actions）桥到 `state.ui` + scoped execute/validate + cleanup  
   - Ref：可序列化定位（用于 Devtools/TimeTravel/scroll-to-error/聚焦）  
   - scoped execute：按 Graph/Plan 推导最小执行集（避免全量）

2) **StateTrait（支点能力）**  
   - computed/source/link/check（以及 node/list/$root 组合子）是“领域 DSL 编译后的共同落点”

3) **领域包只做两件事**  
   - 提供更甜的语法糖（可读性/可生成/可迁移）  
   - 提供领域特定的错误/诊断映射（Form 的 ErrorTree、Query 的 QueryResult、Task 的 FailureReason…）

---

## 5. 对 004 的直接结论（你现在的问题怎么落地）

> “这些领域到底应归属 Form 体系下，还是直接 Module+Logic 最佳实践？”

- **Form 体系（`@logixjs/form`）只收口“可提交草稿 + 字段错误 + touched/dirty”这一类强语义能力**  
  其余领域应该复用 TraitLifecycle/StateTrait 的“同源形状”，但用自己的领域包话术。

- **可编辑表格**：先把它当作 **Form 的 UI 超集**，不要塞进 `@logixjs/form` 本体；更适合作为上层包或最佳实践，用它压力测试 list.list 校验/批量操作/竞态。

- **规则配置器**：更适合独立领域包（Builder），它会强迫我们思考“Ref 的身份锚点（path vs id）”这类 kernel 课题，但不该让 Form 背锅。

- **动态表单引擎**：属于 Form 生态的“应用层”，是验证“蓝图→Module”链路的最佳压测背景，但仍不应膨胀 `@logixjs/form` 的核心表面积。

- **任务面板 / 实时搜索**：属于 Query/Workflow，应该逼我们把 resource/竞态/时间线解释做得更硬，但它们的语义不应该进 Form。

