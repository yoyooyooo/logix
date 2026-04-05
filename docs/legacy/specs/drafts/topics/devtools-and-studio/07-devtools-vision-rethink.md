---
title: 'Runtime Logix · DevTools Vision Rethink (Draft)'
status: draft
version: 0.1.0
layer: L7
value: proposition
priority: 2000
related:
  - ./04-devtools-and-runtime-tree.md
  - ./06-devtools-time-travel-and-replay.md
---

# Runtime Logix · DevTools Vision Rethink (Draft)

> **Context**: 本草案基于 "Researching Devtools Features" 任务中的分析与用户反馈生成，旨在重构 Devtools 的核心价值模型，从“物理层数据展示”转向“意图层与结果层归因”。

## 1. 核心范式转移

| 维度         | 旧范式 (Old Paradigm)          | **新范式 (New Paradigm)**                |
| :----------- | :----------------------------- | :--------------------------------------- |
| **主视图**   | Timeline (线性流水账)          | **Interaction Session** (交互会话)       |
| **核心指标** | Render Frequency (很难拿)      | **Transaction Commit Count** (代理指标)  |
| **诊断模式** | Passive Display (看数据自己猜) | **Active Prescription** (收敛专家给答案) |

## 2. 视图重构：Interaction Session First

**Timeline** 退化为 Session 内部的二级视图，不再作为默认首页。

- **主视图结构**：
  - 左侧：**Interaction Session List**（以用户交互为单位，如 Click, Input, Route Change）。
  - 右侧：**Session Detail & Audits**。
- **Session 核心元数据**：
  - **Intent**: 触发源（Event Name / Action Type）。
  - **Cost**: `Commit Count` (硬开销), `Dirty Selectors` (软穿透).
  - **Outcome**: 最终 State Diff 摘要。

## 3. 渲染压力代理 (Render Pressure Proxy)

鉴于直接 Hook React Render 的滞后性与局限性，采用 **Logix 侧硬指标**作为 Render 压力的**先行指标 (Leading Indicator)**。

### 3.1. Transaction Commit Count (硬指标)

- **定义**：Logix Runtime 向外派发 `commit` 通知的物理次数。
- **阈值**：
  - `1` : **Perfect** (Ideal Batching).
  - `>1`: **Warning** (Potential Render Thrashing).
- **诊断**：如果是同步连续 Commit，说明 Logix 内部 Batch 机制失效；如果是异步连续 Commit，说明产生了中间态震荡。

### 3.2. Subscription Penetration (软指标)

- **定义**：Commit 发生后，Selector/Subscription 回调被触发的次数（排除 Referential Equality 拦截）。
- **意义**：决定了 Render 的**广度**（Impact Radius）。

## 4. 收敛专家 (Convergence Advisor)

Devtools 应具备 pattern-matching 能力，针对典型反模式直接给出配置建议。

| 现象 (Symptom)            | 诊断 (Diagnosis)              | **处方 (Prescription)**                              |
| :------------------------ | :---------------------------- | :--------------------------------------------------- |
| 短时高频重复计算          | High Frequency Re-computation | `scheduler: 'debounce'` / `concurrency: 'switch'`    |
| 依赖链过长导致多次 Commit | Cascade Updates (Waterfall)   | `Transaction.speculate` / Merge Actions / Lazy Trait |
| A -> B -> A 状态震荡      | Flickering State              | Atomic Action / Transition Policy                    |

### "Try Policy" (未来设想)

允许在 Devtools 中动态注入 Policy（如 "Force Debounce 50ms"），实时回放刚才的 Session，验证优化效果。

## 5. Deep Dive: 实现策略与核心难点

### 5.1. Session 边界：静止检测 (Quiescence Detection)

为了将流水账聚类为 "Interaction Session"，Runtime 必须定义“从何时开始，到何时结束”。

- **Start**: 显式 Action Dispatch (User Input) 或 External Signal。
- **Transfer**: 在 Effect 异步链路中，必须通过 `FiberRef` 或 `Context` 隐式传递 `SessionID` (Correlation ID)。
- **End (Quiescence)**: 这是一个难点。
  - **策略 A (含蓄)**: 设定一个短超时（如 50ms），如果该 SessionID 下没有新的 Logix 调度，则视为 Session 结束（Settled）。
  - **策略 B (精确)**: 追踪 Root Scope 下所有 Fork 出的 Fiber 计数，当 Active Fiber 归零时，视为结束。
  - **决策**: 优先尝试 **策略 B** (基于 Logix/Effect 的 Scope 追踪)，能更精准捕捉 Long-running async interactions。

### 5.2. 渲染归因：Selector 身份识别

仅知道 "Dirty Selector Count = 50" 是不够的，用户需要知道 **“是哪 50 个组件？”**。

- **挑战**: `useSelector(s => s.foo)` 是匿名函数，Devtools 难以显示有意义的名字。
- **解法 (Dev模式增强)**:
  - 编译器/Babel 插件：自动给 `useSelector` 注入 `debugLabel` (文件:行号)。
  - 显式 API：`useSelector(..., { label: 'UserProfile' })`。
  - **React Devtools 桥接**: 尝试从 React Fiber Tree 反查挂载了该 Selector 的组件名（高成本，仅在展开详情时按需计算）。

### 5.3. Advisor 规则引擎雏形

Advisor 不是魔法，而是一组 **(Pattern, Threshold, Prescription)** 三元组规则库。

| Rule ID | Pattern Logic (Stream Query)                  | Threshold | Prescription                                     |
| :------ | :-------------------------------------------- | :-------- | :----------------------------------------------- |
| `R-01`  | `count(Tx) where cause=Trait(T) window=100ms` | `> 3`     | "Trait [T] is thrashing. Add `debounce` policy." |
| `R-02`  | `count(Tx) where type=Commit window=16ms`     | `> 1`     | "Sync Waterfall detected. Merge actions?"        |
| `R-03`  | `sum(duration) where type=LockWait`           | `> 5ms`   | "Lock Contention on Resource [R]."               |

这些规则可以在 `packages/logix-devtools-react` 的 `state/audits` 模块中以纯函数形式实现，消费 Timeline 数据流。

### 5.4. 核心：执行链路因果追踪 (Execution Chain Causality)

用户最关注的是 Logix 内部的“多米诺骨牌效应”。因此，Devtools 的核心能力不是 DOM 监听，而是 **Logix Causal Chain 的完整重构**。

- **Root Cause (Session Start)**:
  - 每一个外部触发的 `dispatch(Action)` 视为一个 Session 的起点 (Root ID)。
  - DOM Event 只是可选的 "Decoration Meta"，不影响链路分析核心。

- **Effect Causality (The Chain)**:
  - 利用 Effect 的 `FiberRef` 自动传递 `RootTransactionID`。
  - 追踪链条：`Action A` -> `Reducer` -> `State Change` -> `Trait T (Derived)` -> `Effect E (Side Effect)` -> `dispatch(Action B)`.
  - 这种 **"Action A caused Action B"** 的因果链，才是用户理解“为何系统如此执行”的关键。

- **Timeline 聚类策略**:
  - 不再按时间简单的线性平铺。
  - 而是按 `RootTransactionID` 进行**树状聚类**。所有由 Action A 及其衍生 Effect 触发的子 Action/Commit，都归属于同一个 Session Block。

### 5.5. 语义折叠与画布化 (Semantic Folding & Causal Canvas)

为了实现“人类可读”，必须对执行链路进行**语义折叠**。

- **Canvas Metaphor**:
  - 将执行流绘制为一张**有向无环图 (DAG)**，而非单纯的列表。
  - **关键节点**: `Action`, `Transaction (Commit)`, `Effect (Side Effect)`.
  - **隐藏细节**: 内部复杂的 `Reducer` 计算、`Trait` 依赖计算、`Lock Wait` 等微观步骤，默认**折叠**在连接线或“处理块”中。
- **Rule of Thumb**:
  - **只展示改变了“世界状态”的节点**（发出了 Action，或者提交了 State）。
  - 中间过程简化为箭头（`Action A` ===> `Action B`）。

- **Expanded Node Taxonomy**:
  1.  **Action/Commit**: 核心骨架。
  2.  **Service/Resource (Yellow)**: 外部 IO 边界 (API/DB)。
  3.  **Control Point (Gray)**: 调度干预点 (Debounce/Throttle)。
  4.  **Error/Suspense (Red Triangle)**: 异常流中断。
