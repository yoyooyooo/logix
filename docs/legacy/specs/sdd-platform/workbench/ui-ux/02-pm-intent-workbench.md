---
title: 02 · 需求录入工作台（Excel Killer）
status: draft
version: 1.0
target_audience: 需求录入者（PM/架构师）（Primary）, Frontend Devs (Secondary)
related:
  - ../00-overview.md
  - ../14-intent-rule-schema.md
  - ./03-spec-studio.md
  - docs/ssot/platform/contracts/01-runresult-trace-tape.md
---

> **核心价值**：把非结构化的业务规则压缩为结构化、可审阅、可生成、可验证的意图资产（产品侧呈现为“规则表/条件/动作/示例”；内部可落为 IntentRule/Binding 等），并在设计时提供强校验（减少“看起来对但跑不通”）。
>
> **定位**：面向需求录入者（PM/架构师）的 L0→L1 工作台。它只负责生成/维护设计时资产；运行时验证一律通过 RunResult/Alignment 完成（口径见 `docs/ssot/platform/contracts/01-runresult-trace-tape.md`）。

## 1. 界面布局概览 (Layout)

界面遵循 **“从流式到结构化 (Stream to Structure)”** 的工作流。

| 区域                | 名称                        | 角色     | 关键组件与交互                                                          |
| :------------------ | :-------------------------- | :------- | :---------------------------------------------------------------------- |
| **左侧 / 顶部 (A)** | **意图流 (Intent Stream)**  | **输入** | **富文本编辑器**。支持“智能粘贴”，通过 NLP 提取逻辑。                   |
| **中部 (B)**        | **逻辑网格 (Logic Grid)**   | **编排** | **高密度数据网格**。键盘优先 (Keyboard-First)，支持自动补全与批量操作。 |
| **右侧 / 抽屉 (C)** | **逻辑体检 (Logic Health)** | **校验** | **探针检测结果**。SAT 求解器输出，JSON 预览，冲突解决向导。             |

---

## 2. 详细交互规格 (Interaction Specs)

### 2.1 智能粘贴 (AI Ingestion) —— "Stream to Structure"

- **触发方式**: 用户将 PRD / 聊天记录文本块粘贴到 **A 区**。
- **处理流程**:
  1.  系统检测剪贴板内容。
  2.  向 LLM 发送 Prompt：“提取文本中的逻辑规则并转化为 Logix DSL”。
  3.  返回规则草稿（内部表示：`IntentRule[]`）。
- **反馈**:
  - **B 区** 自动填充生成的规则行。
  - **置信度高亮**: AI 置信度低的术语显示黄色波浪线。悬停提示：“您是指 _用户类型_ 还是 _会员等级_？”。

### 2.2 智能网格 (Logic Grid) —— "Keyboard-First"

- **决策**: **键盘优先**。为了替代 Excel，必须匹配 Excel 的录入速度。重鼠标操作会被高频用户拒绝。
- **数据结构**: 每一行代表一条单一的 `IntentRule` (意图规则)。
- **列定义**:
  - **Trigger (触发器)**: 被监听的字段 (e.g. `user.type`)。
  - **Condition (条件)**: 逻辑门 (e.g. `== 'enterprise'`)。
  - **Effects (副作用)**: 可堆叠的动作 (e.g. `Show(TaxId)`, `Required(TaxId)`)。
- **交互细节**:
  - **智能联想**: 输入 "tax" 立即搜索元数据中的 `tax_id` 字段。
  - **副作用堆叠 (Capsules)**: 同一单元格内多个副作用以胶囊形式显示 `[显示] [必填]`。

### 2.3 逻辑探针 (Logic Probe) —— "Verified Logic"

- **触发方式**: 实时触发 (编辑后 500ms 防抖)。
- **核心引擎**: 基于 **SAT 逻辑求解器** (非 LLM 概率性校验)。
- **校验规则 (硬逻辑)**:
  - **Conflict (冲突)**: 规则 A 与 规则 B 在重叠条件下，对同一目标字段产生矛盾影响 (e.g. 既显示又隐藏)。
  - **Cycle (循环依赖)**: A -> 触发 B -> 触发 A。
- **反馈**:
  - 有问题的规则行显示 **红色边框**。
  - **体检面板 (C 区)** 解释原因：“规则 1 与 规则 5 在字段 '税号' 上存在冲突”。提供“冲突熔断”视图 (Venn 图)。

### 2.4 遗漏补全 (Omission Guard) —— "AI Advisor"

- **角色**: AI 顾问 (软逻辑建议)。
- **场景**: 用户设置了 `Hidden` 但未设置 `Reset`。
- **反馈**: 规则行旁出现 **蓝色信息图标**。点击应用修复 (自动添加 `Reset Value` 副作用)。

---

## 3. 数据流架构 (Architecture)

```mermaid
graph TD
    User[需求录入者（PM/架构师）] -->|粘贴文本| AI[AI 引擎 (LLM)]
    AI -->|DSL 草稿| Grid[智能网格 UI]
    User -->|手动编辑| Grid

    subgraph 校验引擎 (Validation Engine)
        Grid -->|实时规则| Solver[SAT 逻辑求解器]
        Grid -->|上下文| Advisor[AI 顾问]
    end

    Solver -->|冲突错误| UI_Error[UI: 红色标记]
    Advisor -->|建议提示| UI_Warn[UI: 蓝/黄色标记]

    Grid -->|最终确认| Compiler[编译器]
    Compiler -->|JSON| Output[意图 DSL 资产]
    Output -->|消费方| Dev[Logix 运行时 / 开发人员]
```

## 4. 关键决策记录 (ADR)

- **ADR-01: 无 UI 预览 (No UI Preview)**
  - **决策**: 不提供实时 UI 视觉预览。
  - **理由**: 需求录入者应关注 **数据完整性** 和 **逻辑一致性**，而非像素级样式。视觉预览会分散对逻辑漏洞（如脏数据、死逻辑）的注意力。Payload 预览足矣。
- **ADR-02: 基于算法的冲突检测 (Algorithm for Conflicts)**
  - **决策**: 使用 SAT 求解器而非纯 LLM。
  - **理由**: 逻辑冲突是确定性的数学问题。LLM 存在幻觉风险，对于“此时此刻系统是否逻辑自洽”不仅需要概率建议，更需要数学证明。
