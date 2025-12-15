# 运行时三位一体与 Effect 原生 (Runtime Trinity & Effect-Native)

> "Module is the definition. Logic is the program. Live is the execution."
> "Don't hide Effect. Embrace it."

Logix v3 在 API 设计上做出了两个决定性的选择：确立了 **Module / Logic / Live** 的三位一体架构，并全面拥抱 **Effect-Native** 编程模型。

## 1. 运行时三位一体 (The Runtime Trinity)

在 v2 及之前的探索中，我们往往混淆了“定义”与“实例”。v3 将它们彻底拆解为三个正交的概念：

### 1.1 Module (定义 / Definition)

- **What**: 它是对领域知识的纯描述。包含 ID、State Schema、Action Schema。
- **Role**: 它是静态资产，不包含任何运行时状态。
- **Code**: `Logix.Module.make('Counter', { ... })`

### 1.2 Logic (程序 / Program)

- **What**: 它是运行在特定 Module上下文中的一段程序代码。
- **Role**: 它是可移植的逻辑单元。不仅可以在浏览器运行，可以在 Node.js 跑测试，甚至可以被序列化为 Pattern。
- **Code**: `Module.logic(($) => Effect.gen(...))`
  - 这里的 `$` 是关键：它是逻辑与其运行环境之间的**唯一接口**。

### 1.3 Live (执行 / Execution)

- **What**: 它是 Module + Logic 在特定 Scope 下的运行时实例（Effect Layer）。
- **Role**: 它是“活”的。它有生命周期（Init/Destroy），持有真正的 State Ref。
- **Code**: `Module.live(initialState, ...logics)`
  - 当需要“可复用蓝图 + 注入 Env”时，用 `Module.implement({ initial, logics, imports?, processes? })` 再交给 Runtime/React 组合。

这种分离使得 Logix 实现了真正的 **"Orchestration of Intent"**：我们是在编排“逻辑程序”（Logic），而不是在硬编码“对象实例”。

## 2. 拥抱 Effect-Native

很多框架试图隐藏底层的异步复杂度，提供一个看似简单的同步 API（然后通过 Magic 解决异步问题）。
Logix v3 反其道而行之：我们**显式暴露 Effect**。

### 为什么？

因为业务逻辑本质上就是**并发的、易错的、依赖环境的**。

- **并发 (Concurrency)**: 用户可能疯狂点击按钮。你需要 Debounce、Throttle、Race。Effect 提供了最好的原语。
- **错误 (Error)**: 网络可能失败，数据可能校验不过。Effect 的错误通道（E）强迫你面对并处理这些 failure cases，而不是让 Promise 默默吞掉异常。
- **环境 (Context)**: 逻辑需要依赖 API、Config、Logger。Effect 的环境通道（R）让依赖注入变得类型安全且显式。

### Bound API (`$`) 的哲学

尽管底层是 Effect，我们并不希望业务开发者每天手写 `Effect.provide(layer)`。
这也是 `$` 存在的意义：
**`$` 是 Effect 强大能力的“业务投影”。**
它把复杂的 Runtime/Scope/Env 封装在后面，只暴露给开发者最需要的：

- **感知**: `$.onAction / $.onState / $.on`
- **依赖**: `$.use`
- **约束/策略**: `$.flow.*`（以可组合的控制算子表达）
- **终端**: 显式 `.update/.mutate/.run*`（纯更新 vs 副作用）

既保留了 Code 的简洁性（Fluent DSL），又保留了 Effect 的强大底座（Typesafe & Composable）。

## 3. 结论

**Module 定义了世界的形状，Logic 描述了世界的规律，Live 赋予了世界生命。**
而 Effect-TS，就是驱动这个世界运转的物理法则。

## 对齐入口

- 原则层 ↔ 证据层对照：`../reviews/08-philosophy-alignment.md`
