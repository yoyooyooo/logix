---
title: 架构防御：毒药 Effect 模式（Poisoned Effect Pattern）
status: draft
version: 1
tags:
  - architecture
  - effect-ts
  - governance
  - logix
priority: 1500
---

## 0. 核心想法（Core Insight）

在 Effect-TS 体系中，“可以被 `yield*`” 本质上是一种特权，而不是默认权利。

本草稿提出一种针对 Logix / Effect-TS 架构治理的模式：

> 为某些敏感对象（如 `Logix.Module`、权限令牌等）制造一种 **“毒药 Effect”**：  
> - 对 TypeScript 类型系统来说，它看起来是一个合法的 `Effect`，可以被 `yield*`；  
> - 对运行时来说，一旦有人直接 `yield*` 它，就立即触发 `die`（不可恢复错误）并给出明确的架构违规提示；  
> - 真正安全的访问路径通过一个“安全后门”（Symbol 或内部字段）暴露给受信任的 API（如 `$.use`）。

这样可以把原本靠 Lint 约束的“不要直接跑 Module / Token”等规则，收敛到 **运行时物理定律** 层面。

---

## 1. 背景与动机（Motivation）

### 1.1 Logix v3 中的角色划分

在 Logix v3 架构中，我们刻意区分两个层次：

- `Module`：  
  - 领域身份 + 依赖注入 Token；  
  - 表达“这是一个领域模块，其 state/actions 形状是固定的”；  
  - 可以作为 Tag 放进 Layer/Context 中。
- `Link`（以及 Logic）：  
  - 实际执行的业务逻辑流和跨模块/外部系统的协作；  
  - 运行在 Effect Runtime 上，通过 `$.state / $.actions / $.flow` 等访问 Module 的能力。

从架构视角，希望 **跨 Module 写入只能通过 Action** 完成；跨 Module 读状态可以通过只读 Handle，但不应该有“直接拿到底层 Runtime 实例然后随意改”的通路。

### 1.2 Effect-TS 带来的“漏洞”

Effect-TS 中的 `Context.Tag` 本身就是一个 `Effect`：

```ts
// 本意：仅引用身份
const UserModule = Logix.Module("User", /* ... */)

// 但在 Effect-TS 语义下，这也是一个 Effect：
const rawRuntime = yield* UserModule  // 编译器不会报错
```

如果 `Logix.Module` 直接返回一个继承自 `Context.Tag` 的 Tag，那么：

- 开发者可以 `yield* UserModule` 拿到 **底层 ModuleRuntime 实例**；  
- 进一步就能调用 `.setState()` / `.ref()` 等底层 API，绕过 `$.use(UserModule)` 提供的只读封装；
- 架构上“跨模块只读、写入靠 Action”的约束就退化为“君子协定”，而不是强约束。

### 1.3 目标

我们希望做到：

- 对于业务/平台侧代码：
  - `UserModule` **只能被引用，不能被直接执行**；  
  - 一旦有人试图 `yield* UserModule`，程序应立即以清晰的错误信息终止。
- 对于框架内部（Logix Core / BoundApi）：
  - 仍然保留一条“安全后门”，可以拿到真正的 `Context.Tag` / ModuleRuntime，并基于它构造只读 Handle。

换句话说：**收回对“敏感对象”的 `yield*` 权限，只允许通过受管道的 API（如 `$.use`）获取能力。**

---

## 2. 模式定义：毒药 Effect（Poisoned Effect）

### 2.1 概念

“毒药 Effect” 是一个特殊对象，它满足：

- 在 TS 类型系统中，结构/标记足以被视为 `Effect.Effect<_,_,_>` 或 `Context.Tag` 可 yield 的值；
- 但在 Effect 运行时解释执行时，会被解析为一个“立即 `die` 的指令”，携带详细的架构错误信息；
- 同时，它还包含一个只有框架内部知道的 Symbol 字段，指向真实的 Tag 或底层实现。

抽象地看，一个毒药 Module 大致长这样：

```ts
const kRealTag = Symbol.for("logix/real-tag") // 安全后门

const PoisonedModule = {
  // 1. [类型伪装] 满足 Effect/Tag 的结构（简化示例）
  [Effect.EffectTypeId]: {
    _V: "Effect",
    _Op: "die",
    message: `🛑 [Logix Architecture Violation]

禁止直接运行 Module!
❌ const rt = yield* MyModule;
✅ const $M = yield* $.use(MyModule);
`
  },

  // 2. [安全后门] 只给框架内部的 API 用
  [kRealTag]: ActualContextTag,

  // 3. [pipe 兼容性] 保证在 pipe 链中行为正常（视实现需要）
  pipe() { /* ... */ }
}
```

业务开发者只会拿到 `PoisonedModule` 这一层：

- 写 `yield* UserModule` 时，Effect Runtime 会看到 `_Op: "die"`，直接熔断；  
- 只有框架内部的 `$.use` / Link 实现知道从 `[kRealTag]` 里拿出真正的 Tag，再做安全封装。

---

## 3. 消费侧协议：谁能解毒，谁会中毒？

### 3.1 唯一的解毒者：`$.use`

Bound API 中的 `$.use` 是“唯一持有解药的消费者”，其逻辑类似：

```ts
const kRealTag = Symbol.for("logix/real-tag")

// 伪代码
$.use = (dependency: any) =>
  Effect.gen(function* () {
    // 1. Module：带有后门 Symbol
    if (dependency && dependency[kRealTag]) {
      const tag = dependency[kRealTag] // 真正的 Context.Tag
      const runtime = yield* tag       // 此处才允许直接 yield*
      return makeReadonlyHandle(runtime)
    }

    // 2. 普通 Service：直接作为 Tag/Effect 使用
    //    即对不带毒的 Context.Tag / Service Tag 保持原有语义
    return yield* dependency
  })
```

在这个协议下：

- **Module Tag**：对外暴露的是毒药版本，只能通过 `$.use(Module)` 使用；  
- **普通 Service Tag**：仍然可以直接 `yield* SomeServiceTag`，保持 Effect-TS 原有体验；
- 框架内部可以通过 `kRealTag` 访问真实 Tag，但业务代码不需要、也不应该知道这个细节。

### 3.2 违规者：直接 `yield*`

当业务开发者写出类似代码：

```ts
Effect.gen(function* () {
  // 想绕过 $.use，直接拿 Runtime
  const rt = yield* UserModule
})
```

运行时会：

- 解析 `UserModule` 上的 Effect 标记；
- 发现 `_Op: "die"`，即刻抛出不可恢复错误；
- 错误信息可以明确提示“这是架构级违规，并给出正确写法”：

> 禁止直接运行 Module!  
> ❌ `const rt = yield* MyModule`  
> ✅ `const h = yield* $.use(MyModule)`

这比一个晦涩的 `TypeError: undefined is not a function` 更“有教育意义”和更易于运维定位。

---

## 4. 价值分析（Value Proposition）

### 4.1 从 Lint 规则到运行时物理定律

传统做法是：

- 写 ESLint 规则禁止特定语法（例如 no-restricted-syntax），不准直接 `yield* Module`；
- 但 ESLint：
  - 可以被局部禁用（`// eslint-disable-next-line`）；  
  - 对运行时行为无强约束。

毒药 Effect 把这类约束下沉为“运行时物理定律”：

- 代码写错了，程序就直接崩（以清晰错误），而不是悄悄绕过架构边界；
- 在 CI/测试环境中，可以确保任何绕过规范的用法在实践中立即暴露；
- 对于“架构不能妥协”的边界（比如跨模块写入路径），这是更稳的防线。

### 4.2 保护封装与抽象边界

对于 Logix 来说，这个模式直接保护了两个关键抽象：

- **ModuleRuntime 的底层能力永不泄漏到业务层**：
  - `setState` / `ref` / 内部 streams 等只在 Runtime/BoundApi 内部使用；  
  - 业务逻辑层所有对模块的写入都必须通过 Action（`$.actions.xxx` 或 `ModuleHandle.dispatch`）完成。

- **跨模块协作统一走 $.use / Link / Adapter**：
  - 读其他模块的 state → `$.use(OtherModule)` 返回的只读 Handle；  
  - 跨系统/复杂 wiring → 用 Link/Adapter/扩展包封装；  
  - 不存在“某个逻辑突然直接拿到对方 Runtime 然后乱改”的后门。

### 4.3 开发者体验（DX）

毒药 Effect 并非简单“提高错误率”，反而能改善 DX：

- 相比模糊的运行时错误（`Cannot read property setState of undefined`），  
  它提供了**结构化的、自解释的错误信息**，告诉开发者：  
  - 哪种写法是被禁止的；  
  - 推荐替代方案是什么（例如 `$.use`、Link 工厂等）。
- 对新同学/新加入团队的工程师来说，这是一个“运行时教学工具”，一步步把他们从“Effect 可以随便 yield”引导到“架构规定了哪些东西可以 yield，哪些不行”。

---

## 5. 推广性与适用场景

虽然本模式首先是为 Logix v3 架构设计的，但对所有基于 Effect-TS 的系统都有借鉴意义：

- **资源保护**：  
  - 对数据库连接池、全局缓存、低级 IO Handle 等对象，防止业务层直接 `yield* PoolTag` 获得“裸资源”，强制通过 Repository/Service 层访问；
- **权限令牌**：  
  - 对某些敏感 Token（如 AdminToken），禁止业务逻辑直接 `yield* AdminToken` 获得真实值，必须通过 `Auth.use(AdminToken)` 等 API 做验证与控制；
- **配置信号**：  
  - 有些配置对象在类型上也是 `Effect`，但从语义上不应该被当成“可执行副作用”，可以用毒药模式防止被误用。

本质上：

> 在 Effect 系统中，“可以被 `yield*`”是一种需要被架构师显式授予的权利，而不是默认落在每个对象上的能力。  
> 毒药 Effect 模式提供了一种收回这项权利、并集中交给少数受信任 API 的机制。

---

## 6. 后续工作与开放问题

- 对 Logix v3：
  - 在 `core/02-module-and-logic-api.md` 或实现备忘录中，明确 `Logix.Module` 返回的是“受保护 Tag”，只能通过 `$.use` 等 API 解封；  
  - 给出精简版实现草图，约定好 `[kRealTag]` 这类后门字段的命名与使用范围。
- 对 Effect Runtime 实现：
  - 评估与当前 `EffectTypeId` / `_Op` 结构的兼容性，确保“die 指令 + 自定义 message”能以标准方式集成；  
  - 与现有错误追踪 / Debug 工具（如 Scope Inspector）整合，在 UI 中更直观地展示这类架构违规。
- 对团队治理：
  - 将“哪些 Tag 是毒药（只能通过某些 API 使用）”列入架构约定；  
  - 在 Guide 中给出对应的“正确用法示例”，避免开发者只看到错误信息却没有替代方案。

这篇草稿聚焦于模式本身，具体实现细节与 API 形状可在 Logix Core/Impl 文档中继续细化。  
关键是先达成共识：**某些抽象不应该被随意 `yield*`，而毒药 Effect 提供了一个在 Effect 生态中实现这一点的通用手段。**

