---
title: 01 · Module Traits 与 SDD 平台整合
status: draft
version: 2025-12-10
---

# Module Traits 与 SDD 平台整合

> 本文档描述 `StateTrait`（来自 `specs/000-module-traits-runtime`）如何与 SDD 平台（Specify → Plan → Tasks → Implement）各阶段集成，成为从"业务意图"到"可执行代码"链路中的结构化锚点。

## 1. 核心定位：Trait 作为"结构化真理层"

在 SDD 平台中，我们面临一个关键挑战：**如何让 AI 生成的代码既可验证、又可可视化？**

传统方案的痛点：

| 方案                     | 问题                                        |
| :----------------------- | :------------------------------------------ |
| 让 AI 生成完整 Effect 流 | 命令式代码难以解析，Studio 无法逆向还原意图 |
| 让 AI 生成 JSON 配置     | 无法表达复杂逻辑，需要二次翻译为代码        |
| 完全依赖人工 Review      | 无法自动验证"代码是否符合 Spec"             |

**Module Traits 的解法**：

```
ScenarioSpec (业务意图)
    ↓ AI 推断
StateTraitSpec (结构化声明)
    ↓ StateTrait.build()
StateTraitGraph (可验证 IR)
    ↓ StateTrait.install()
Effect Runtime (可执行代码)
```

Traits 层的价值在于：

- **对上**：可从 ScenarioSpec 推断（"加载用户资料" → `source` Trait）
- **对下**：可编译为具体的 Effect 行为（watcher / Flow / middleware）
- **对外**：可导出为 Graph，支持 Studio 可视化与 Diff

## 2. SDD 各阶段的 Trait 集成点

### Phase 1: SPECIFY → 推断 Trait 需求

**输入**：`ScenarioSpec.Steps`（Given / When / Then）

**Spec Agent 任务**：从 Steps 中识别潜在的字段能力需求

| Step 描述                            | 推断的 Trait                                                                   |
| :----------------------------------- | :----------------------------------------------------------------------------- |
| "当用户选择省份时，城市列表自动更新" | `cityList: StateTrait.link({ from: "selectedProvince" })` 或 `source`          |
| "显示订单总价（= 单价 × 数量）"      | `totalPrice: StateTrait.computed(s => s.price * s.quantity)`                   |
| "加载用户资料（从 API）"             | `profile: StateTrait.source({ resource: "user/profile", key: s => s.userId })` |

**产出**：`TraitHint[]` — 附加在 ScenarioSpec 上的字段能力建议

```ts
interface TraitHint {
  fieldPath: string
  suggestedKind: 'computed' | 'source' | 'link'
  reasoning: string // AI 解释为何推断此 Trait
}
```

### Phase 2: PLAN → 确定 Module 图纸骨架

**输入**：`FeatureSpec` + `TraitHint[]` + 现有 Module Schema

**Architect Agent 任务**：

1. 确定 State Schema 结构（哪些字段、什么类型）
2. 为每个字段分配 Trait 能力
3. 生成初步的 `StateTraitSpec` 骨架

**产出**：`Module Blueprint`

```ts
// Module 图纸骨架（Plan 阶段产物）
{
  moduleId: "OrderDetail",
  state: {
    orderId: "string",
    items: "Array<OrderItem>",
    totalPrice: "number", // 标记为 computed
    profile: "UserProfile" // 标记为 source
  },
  traits: {
    totalPrice: { kind: "computed", deps: ["items"] },
    profile: { kind: "source", resourceId: "user/profile" }
  }
}
```

### Phase 3: TASKS → 拆解为原子任务

**输入**：`Module Blueprint`

**Task Agent 任务**：将每个 Trait 声明拆解为可独立验收的 Task

| Task ID | 描述                                | 验收条件                                 |
| :------ | :---------------------------------- | :--------------------------------------- |
| T01     | 为 `totalPrice` 实现 computed Trait | 修改 items 后 totalPrice 自动更新        |
| T02     | 为 `profile` 实现 source Trait      | 触发加载后 profile 字段包含 API 返回数据 |
| T03     | 在 `traits` 对象中声明所有能力      | `StateTraitGraph.build()` 无错误         |

**特点**：每个 Task 对应 `StateTraitSpec` 中的一个 Entry，天然原子化。

### Phase 4: IMPLEMENT → 填充具体实现

**输入**：`Task` + `Module Blueprint` + `Bound API Types`

**Coder Agent 任务**：生成具体的 `traits` 代码

```ts
// Coder Agent 生成的代码
traits: StateTrait.from(StateSchema)({
  totalPrice: StateTrait.computed((s) => s.items.reduce((sum, item) => sum + item.price * item.qty, 0)),
  profile: StateTrait.source({
    resource: 'user/profile',
    key: (s) => ({ userId: s.orderId.split('-')[0] }),
  }),
})
```

**Codegen 优势**：

- 比起生成完整的 `$.onState(...).run(...)` 流，生成 `traits` 对象更可控
- 结构固定，格式可预测，便于 AST 校验
- 类型错误（如 `deps` 路径不存在）可被 TS 立即捕获

## 3. 验证闭环：Trait Graph 作为验收契约

### Scenario Runner 集成

```
ScenarioSpec.Steps
    ↓ 执行
Sandbox Runtime
    ↓ 产出
RunResult (StateTraitGraph + EffectOp Timeline)
    ↓ 对比
Alignment Report
```

**验证维度**：

| 维度           | 验证方式                                                 |
| :------------- | :------------------------------------------------------- |
| **结构正确性** | `StateTraitGraph` 是否包含 ScenarioSpec 期望的字段与依赖 |
| **行为正确性** | EffectOp Timeline 是否按 Scenario Steps 顺序触发         |
| **状态正确性** | 每个 Step 后的 State Snapshot 是否符合 `Then` 断言       |

### 自愈循环

当验证失败时，平台将以下 Context 回传给 Coder Agent：

```json
{
  "error": "Step 'select province' failed: cityList did not update",
  "expectedTrait": { "path": "cityList", "kind": "link", "from": "province" },
  "actualGraph": {
    /* 当前 StateTraitGraph */
  },
  "trace": [
    /* 相关 EffectOp 事件 */
  ]
}
```

Agent 可基于这些信息自动修复 `traits` 声明。

## 4. 与 Studio 的集成

### Code → Studio（解析）

Studio 可直接消费 `StateTraitGraph`：

- **Galaxy View**：展示模块间的 Trait 依赖（哪些模块共用同一 `resourceId`）
- **Module View**：展示模块内的字段拓扑（computed / link / source 的依赖边）
- **Diff View**：对比两个版本的 `StateTraitGraph`，高亮变更

### Studio → Code（生成）

PM 在 Studio 中的操作可映射为 Trait 变更：

| Studio 操作          | 生成的代码变更                                   |
| :------------------- | :----------------------------------------------- |
| 拖拽连线（A → B）    | 添加 `B: StateTrait.link({ from: "A" })`         |
| 标记字段为"远程数据" | 添加 `X: StateTrait.source({ resource: "..." })` |
| 定义计算公式         | 添加 `Y: StateTrait.computed(s => ...)`          |

因为 `traits` 是声明式对象，AST 变更局限在固定位置，风险可控。

## 5. 总结：Trait 在 SDD 中的角色

```
┌─────────────────────────────────────────────────────────────┐
│  SDD Platform                                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ScenarioSpec ──────────────────────────────┐               │
│       │                                     │               │
│       │ AI 推断                              │ 验证          │
│       ▼                                     │               │
│  ┌─────────────────┐                        │               │
│  │ StateTraitSpec  │◀───────────────────────┘               │
│  │ (结构化锚点)     │                                        │
│  └─────────────────┘                                        │
│       │                                                     │
│       │ build()                                             │
│       ▼                                                     │
│  ┌─────────────────┐                                        │
│  │ StateTraitGraph │ ◀─── Studio 可视化                      │
│  │ (共享 IR)        │ ◀─── Diff / Review                     │
│  └─────────────────┘                                        │
│       │                                                     │
│       │ install()                                           │
│       ▼                                                     │
│  ┌─────────────────┐                                        │
│  │ Effect Runtime  │ ──▶ EffectOp Timeline ──▶ 验证闭环     │
│  └─────────────────┘                                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**核心价值**：

- **对 AI**：提供结构化的生成目标，降低幻觉风险
- **对 Studio**：提供可解析的 IR，支持双向编辑
- **对验证**：提供可比对的 Graph，支持自动化验收
