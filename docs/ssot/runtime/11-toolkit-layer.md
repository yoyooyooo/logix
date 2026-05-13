---
title: Toolkit Layer
status: living
version: 4
---

# Toolkit Layer

## 目标

定义官方 `@logixjs/toolkit` 的定位、边界、准入门禁与 Agent First 约束。

当前总原则额外固定一条：

- 维护者优先减少“用户需要记住的真相数”，不优先减少“用户今天少写的代码行数”

## 定位

`@logixjs/toolkit` 当前固定为：

- 官方通用 DX 层
- official secondary layer
- maintainer-curated 的收口点

它服务的对象包括：

- support
- helper
- sugar
- recipe
- pattern kit

它不承接：

- core truth
- 领域 owner law
- 第二套 runtime 心智

## 与 core 的关系

toolkit 与 core 的关系固定为：

- core 持有 canonical spine
- toolkit 只在 spine 之上做组合
- toolkit 不进入 `Module / Logic / Program / Runtime / React host law` 这条主链
- toolkit API 必须可回解到 core / domain primitives

对外理解顺序固定为：

1. 先看 core law
2. 再看 toolkit 如何压缩重复姿势
3. 出问题时按 de-sugared mapping 下钻到 core

toolkit 的对外理解当前进一步收口为：

- 它是 de-sugared recipe protocol layer
- 它不是“第二套更顺手的公开 API”
- 删掉一个 toolkit recipe，用户最多只是多写几行
- 保留一个 toolkit recipe，不得让用户多学一套 world model

## 与领域包的关系

toolkit 不等于领域包。

领域包负责：

- 领域模型
- 领域 DSL
- 领域默认行为
- 领域 owner law

toolkit 负责：

- 跨领域高频组合
- 官方推荐的 DX wrapper
- recipe / preset / pattern kit

因此：

- Query / Form / I18n / Domain 不持有 toolkit truth
- toolkit 可以包装它们
- owner 继续停在对应 package 或 core
- 像 `Query.Engine.Resource` 这样的领域 owner landing 继续停在 query package；toolkit 只能在其上做 DX 包装

## Core-first 准入门禁

维护者在接到真实使用反馈后，按下面顺序裁决：

在进入下面三步前，先做一层 helper 三分法：

- 若补的是 owner truth / primitive contract / identity / diagnostics / verification 真相，归 `core-or-owner`
- 若只是建立在既有 truth 之上的 blessed de-sugared recipe，归 `toolkit-recipe`
- 若混入 value / error / ui / event / 页面 policy，归 `app-local`

`app-local` 默认不进入官方 surface 讨论。

### 1. 先判断是否应进 core

满足下面任一条件，优先进入 core：

- 缺的是 primitive contract
- 缺的是 owner / identity / projection / diagnostics / verification 真相
- 该能力应被所有用户按 canonical law 理解
- 该能力本质上是 policy-free 的稳定底层对象
- 该能力只是对已冻结 raw truth 做一跳、严格、policy-free 的代数投影，且不会新增 acquisition route、第二对象真相或新 owner

### 2. 再判断是否进入 toolkit

只有同时满足下面条件，才进入 toolkit：

- 该能力完全建立在既有 core / domain truth 之上
- 主要收益是减少样板、统一默认组合、提高 authoring 效率
- 可以承接 blessed default policy、recipe、preset、wrapper
- 移除该能力不会改变底层 runtime 语义
- 它仍能被 Agent 明确展开回 core
- 它不只是对既有 raw truth 的 strict one-hop derivation corollary
- 它不会把未冻结语义提前包装成稳定习惯

### 3. 否则继续停在业务项目

如果既不该进 core，也没有足够密度进入 toolkit，就继续停在业务项目局部封装里，不升格为官方 surface。

## Agent First 约束

toolkit 必须同时满足下面约束：

- noun 稳定、明确、可直接教给 Agent
- 每个 helper 都有可解释的 de-sugared mapping
- 不依赖隐藏上下文成立
- 不引入第二 authoring 主链
- 不让 Agent 记忆多套等价入口
- 对 covered scenario，toolkit 可以成为推荐 DX 入口
- 对 uncovered scenario，直接回到 core

每个 toolkit recipe 额外必须带三类材料：

- 覆盖场景
- de-sugared mapping
- 明确不覆盖的场景，以及何时退回 core

## 能力预算

toolkit 当前允许承接的能力类型包括：

- React bindings
- form / query / async / crud 的高频 wrapper
- program composition helper
- recipe / preset / pattern kit
- 基于既有 evidence 的诊断辅助

toolkit 当前明确拒绝：

- 第二套 runtime
- 第二套 host law
- 第二套 pure projection truth
- 第二套 verification control plane
- 第二套 error truth
- 第二套 list identity truth
- 隐式 IO
- 隐式生命周期
- 黑盒 fallback
- 无法回解到 core 的 magic object
- 通过混合 value / error / ui / event 多层语义来伪装成“通用 helper” 的对象

React host residue 的追加约束：

- 不得直接继承任何已删除的历史 noun lineage
- 若未来存在新的局部 recipe 真实场景，必须先经过 `runtime/12` intake
- 涉及 core host truth 的对象不属于 toolkit reopen bucket
- `useModuleList` 不属于 toolkit reopen 候选；它只作为已消费 residue 退出公开 host contract

## 包结构

第一阶段只冻结一个官方包：

- `@logixjs/toolkit`

卫星包当前不冻结。

如果将来要拆分，必须先证明：

- 能力密度已经形成稳定边界
- 拆分能降低 root export 噪声
- 拆分不会制造第二层入口迷雾

## 文档口径

关于 toolkit 的文档规则固定为：

- core 页面继续先讲 canonical spine
- toolkit 页面讲推荐 DX 层
- toolkit 候选识别协议统一看 [./12-toolkit-candidate-intake.md](./12-toolkit-candidate-intake.md)
- tutorial 若采用 toolkit 写法，必须同时给出 core 展开视图
- toolkit 不得自带独立 truth 文档宇宙

## 与 form helper 的关系

toolkit 是官方收口 support / helper / sugar 的位置。

这意味着：

- 那些不该进 core 的 Form helper，可以进入 toolkit
- `Form.Error.field(path)` 这类 owner primitive 仍留在 Form / core truth
- toolkit 上的 form wrapper 只能建立在既有 core host law 与 Form owner primitive 之上
- 任何 Form convenience 若会让用户多学一套 declaration / host / error / list identity 心智，直接拒绝

## 当前一句话结论

toolkit 是官方二层，用来收口不该进 core 的 support / helper / sugar；core 继续持有 truth，像 strict one-hop derivation 这类轻量派生也优先回 core。
