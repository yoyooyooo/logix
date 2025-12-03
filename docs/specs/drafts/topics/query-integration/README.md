---
title: Query Integration · 概览与路线图
status: draft
version: 2025-11-30
value: extension
priority: next
---

# Query Integration · 概览与路线图

## 主题定位

本 Topic 收录所有关于 **"Logix + Query/异步数据管理"** 集成的草稿，涵盖：

- TanStack Query 集成策略
- Module 层 Query API 设计（声明式 Query Field、显式 Query Logic、手动集成）
- Reactive Schema 与数据范式
- Module Computed 与 Query 的融合

## 当前路线共识

### 核心设计方向

**三层渐进式 API**（从声明式到手动）：

1. **Layer 1: Declarative Query Field** (`Query.field`)
   - 目标：80% 标准 GET 场景
   - 形态：将 Query 定义内聚在 State Schema 中
   - 示例：`profile: Query.field({ queryKey, queryFn, enabled })`

2. **Layer 2: Explicit Query Logic** (`createQueryLogic`)
   - 目标：自定义副作用、跨 Module 依赖、复杂触发条件
   - 形态：显式 Logic 工厂函数
   - 示例：`createQueryLogic(Module, { params, query, target, onSuccess })`

3. **Layer 3: Manual Integration**
   - 目标：兜底方案（Infinite Query、Suspense、极端竞态控制）
   - 形态：在 `Module.logic` 中手动编排 `QueryClient`

### 关键决策

- **Module-Native**: Query 不是外挂，而是 State 的一部分
- **Schema-Driven**: 利用 Schema 元数据自动生成标准 Logic
- **Progressive**: 80% 场景用 Layer 1，20% 复杂场景下沉到 Layer 2/3

## Topic 文档列表

- [01-unified-api-design.md](./01-unified-api-design.md) - 三层 API 设计与架构评估
- [02-integration-strategies.md](./02-integration-strategies.md) - TanStack Query 集成策略（零封装 vs 二次封装）
- [03-module-computed.md](./03-module-computed.md) - Module 层 Computed 与 Query 的完美妥协
- [04-reactive-paradigm.md](./04-reactive-paradigm.md) - Reactive Schema 与统一数据范式

## 待决问题

- [ ] Layer 1 (`Query.field`) 的 TypeScript 递归类型推导如何解决？
- [ ] 是否在 `Module.live` 阶段自动扫描 Schema 并注入 Query Logic？
- [ ] Mutation / Infinite Query 的设计方案
- [ ] 与 Reactive Module 的融合路径

## 后续工作

1. **短期（v3.x）**: 实现 Layer 3（手动集成）打通底层
2. **中期（v3.x+）**: 实现 `createQueryLogic`（Layer 2）覆盖大部分场景
3. **长期（v4.0）**: 攻克 TypeScript 类型难点，实现 `Query.field`（Layer 1）

---

最后更新：2025-12-02
