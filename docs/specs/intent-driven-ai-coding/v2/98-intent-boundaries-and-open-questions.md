---
title: 98 · Intent 边界与长期关注点
status: draft
version: 0
---

> 本文记录「Intent 边界」相关的约束、灰区与长期需要反复审视的问题。它不直接定义 Schema，而是作为设计/评审/演进时的参考清单。

## 1. 总体目标与风险提示

- 目标：让 Intent 尽可能承载“开发者脑子里的业务/交互意图”，而不是变成「换一种格式写代码」；
- 风险：一旦 Intent 层不断吸收组件/Hook/文件级细节，就会退化成 DSL 垃圾场，既难写也难演进，最后所有人绕回去直接写代码。

## 2. 横向原则回顾（适用于所有意图层）

- 只说 What，不写 How：  
  - Intent 描述“想要达成什么”：布局分区、用例、字段含义、流程步骤；  
  - 实现细节（组件实现、Hook 名、路径、Effect 组合）应由 Pattern/Template/Plan/代码层承担。
- 字段应尽量是业务/产品可读：  
  - 如果一个字段业务侧完全看不懂，多半属于实现细节，需谨慎放入 Intent。
- Intent 可以不完备，但核心要稳定：  
  - 允许只写 Layout + View + 核心 Behavior/Data，后续增量补充；  
  - 代码重构优先通过 Pattern/Template/Plan 吸收，不频繁修改 Intent。
- 默认编辑体验是线稿/用例视角：  
  - Schema/TS 视图是高级入口，不鼓励常规开发者在里头「写 DSL」。

## 3. 各意图层的典型灰区（需持续观察）

### 3.1 View & Component Intent

- 灰区例子：
  - `filters.layout: inline`：  
    - 若显著影响操作效率（例如运营工作台对横排/竖排有强诉求），可以视为业务决策（What）；  
    - 若只是视觉风格差异，则更接近实现细节（How），应交给 UI 层。
  - 列宽、对齐方式、Icon 选择等：  
    - 可能有业务含义（例如对齐金额、突出某字段），也可能只是视觉微调。  
- 长期关注点：  
  - 随着更多真实页被建模，需要统计哪些 View 配置经常被写进 Intent，但又频繁变更，提示这些配置可能不适合在 Intent 层承载。

### 3.2 Data & State Intent

- 灰区例子：
  - 状态是否缓存、过期策略等：  
    - 某些业务场景可能对缓存行为有强需求（例如「列表必须实时」）；  
    - 多数情况下这些属于实现层策略，适合放在 best-practice/配置而非 Intent。
- 长期关注点：  
  - 如何在「业务上希望的数据新鲜度/一致性诉求」与「具体缓存实现策略」之间保持清晰边界；  
  - 是否需要在 Data & State 层引入更抽象的“新鲜度策略”字段，而非直接配置缓存参数。

### 3.3 Behavior & Flow Intent

- 灰区例子：
  - 某些错误处理是否属于业务语义（例如审批拒绝的分支）还是纯技术重试/降级；  
  - 在 Intent 中表达「必须幂等」还是在 Effect/Layer 中通过策略约束。  
- 长期关注点：  
  - 行为层的粒度是否合适：如果同一 FlowIntent 频繁变动且很长，可能需要拆分成多个小 Flow 或提升抽象层级；  
  - 哪些“业务规则”应上升为 Behavior Intent 的一部分，哪些应留在领域服务代码中。

### 3.4 Interaction / Layout / Code Structure

- Interaction：  
  - Loading 状态、按钮禁用等即时反馈，有时既有业务含义又有实现意味，需要持续收集模式以决定放在哪一层最合适。  
- Layout：  
  - 列数/区域比例和具体栅格实现的边界；不同产品线可能有不同敏感度。  
- Code Structure：  
  - 模块拆分的粒度（一个 Intent 对应一个 feature 目录？多个 Intent 共享？）在不同团队实践中可能出现分歧。

## 4. 工具与指标：未来演进方向

> 本节内容不要求当前迭代立即实现，用于指引后续 CLI/遥测功能。

### 4.1 Intent Lint 规则候选

- `no-implementation-details`：  
  - 检查 Intent 中是否出现明显的实现细节字段（component/hookName/stateKey/import/path 等）；  
  - 初版可基于关键字匹配，后续结合 AST/Schema 做更精细判断。
- `business-readable`：  
  - 对描述性字段做简单检测，避免塞入大量内部变量名而缺乏业务语义。

### 4.2 稳定性与演进健康度指标

- 修改频率：  
  - 每个 Intent 在一定时间窗口内的变更次数，过高可能意味着抽象不当或边界不清。
- 修改深度：  
  - Layout/View/Data/Behavior 各层的变更分布，帮助判断是哪一层建模有问题。
- Plan diff 稳定性：  
  - 同一 Intent 在多次 apply 之间生成的 Plan 差异大小，过大说明 Intent→Plan 映射不稳定。

这些指标未来可用于：

- 为 Intent/Pattern/Flow 设计做健康度评估；  
- 辅助决定某些 schema 或边界是否需要调整。

## 5. 实践回流：用真实 feature 校正边界

- 建议：每当有一批真实 feature 完成 Intent 建模（特别是 Data/View/Behavior），就抽样做一次「Intent 边界回顾」：
  - 检查常见字段是否在 Intent 层承担了过多实现细节；
  - 梳理哪些信息在 Intent 和 Pattern/代码中重复出现；
  - 将新发现的 Anti-pattern 或灰区写回各层的 design 文档，并酌情补充 lint 规则。
- 目标：通过持续实践反哺，让 Intent 边界规范像 best-practice 一样，逐步从“经验”变成“约定俗成”。

