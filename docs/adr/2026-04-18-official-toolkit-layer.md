---
title: Official Toolkit Layer
status: accepted
date: 2026-04-18
---

# Official Toolkit Layer

## 决策

当前仓库接受一个官方二层：

- 新增 `@logixjs/toolkit`
- 它是官方通用 DX 层
- 它不是企业专属层
- 它不进入 core public spine
- 它不持有第二真相源

toolkit 的定位固定为：

- core-first 之后的 secondary layer
- maintainer-curated 的收口点
- 用于承接不该进 core 的 support / helper / sugar / recipe / pattern kit

toolkit 的核心前提固定为：

- truth 继续停在 `@logixjs/core`、`@logixjs/react` 与各领域包
- toolkit 只能组合既有 truth
- toolkit API 必须可机械回解到 core / domain primitives
- toolkit 不得改 owner law、host law、control plane law 或 diagnostics truth

toolkit 的准入门禁固定为：

### 进入 core

候选能力若满足下面任一方向，默认优先进入 core：

- 它补的是缺失的 primitive contract
- 它补的是 owner / identity / projection / diagnostics / verification 的真相缺口
- 它需要被所有用户按 canonical law 理解
- 它天然属于 policy-free 的稳定底层对象
- 它只是对已冻结 raw truth 做一跳、严格、policy-free 的代数投影，且不会新增 acquisition route、第二对象真相或新 owner

### 进入 toolkit

只有同时满足下面条件，才进入 toolkit：

- 该能力完全建立在既有 core / domain truth 之上
- 主要收益是降低样板、统一默认姿势、提高组合效率
- 可以承接 blessed default policy、recipe、preset、wrapper
- 把它移出 toolkit，不会改变 runtime 语义与底层 owner
- 它不只是 strict one-hop derivation corollary

### 直接拒绝

下面这些方向默认不进入 toolkit：

- 第二套 runtime
- 第二套 host law
- 第二套 pure projection truth
- 第二套 verification control plane
- 第二套 error truth
- 第二套 list identity truth
- 隐式 IO
- 隐式生命周期
- 黑盒 fallback
- 无法解释为 core 展开的 magic object

## Agent First 约束

toolkit 必须同时满足：

- API noun 稳定、可预测、可被 Agent 直接记忆
- 每个高层 helper 都有可解释的 de-sugared mapping
- 不依赖隐藏上下文成立
- 不要求 Agent 记住第二套 authoring 主链
- 对 covered scenario，可以成为推荐 DX 入口
- 一旦下钻，必须回到同一条 core law

## 包结构决定

第一阶段只固定一个官方包：

- `@logixjs/toolkit`

是否拆成 `toolkit-form`、`toolkit-query`、`toolkit-react` 等卫星包，当前不冻结。
只有在能力密度、边界和导出噪声都足够明确时，才允许再拆。

## 后果

- `Module / Logic / Program / Runtime / React host law` 继续是 canonical spine
- toolkit 成为官方 blessed 的 secondary layer
- 日常高频 helper、recipe、wrapper 可以在 toolkit 收口
- 任何 toolkit 能力若后续被证明应成为 primitive，应优先回推 core，再决定是否保留 toolkit facade
- 围绕既有 raw truth 的轻量严格派生，默认先走 core probe，不再优先计入 toolkit 波次
- 领域包不再被迫在各自 package 内承担官方 DX wrapper family 的职责

## 相关页面

- [../ssot/runtime/01-public-api-spine.md](../ssot/runtime/01-public-api-spine.md)
- [../ssot/runtime/08-domain-packages.md](../ssot/runtime/08-domain-packages.md)
- [../ssot/runtime/10-react-host-projection-boundary.md](../ssot/runtime/10-react-host-projection-boundary.md)
- [../ssot/runtime/11-toolkit-layer.md](../ssot/runtime/11-toolkit-layer.md)
- [../ssot/form/05-public-api-families.md](../ssot/form/05-public-api-families.md)
- [../ssot/form/13-exact-surface-contract.md](../ssot/form/13-exact-surface-contract.md)

## 当前一句话结论

`@logixjs/toolkit` 是官方通用 DX 二层；core 持有 truth，toolkit 收口不该进 core 的 support / helper / sugar，轻量严格派生优先回 core。
