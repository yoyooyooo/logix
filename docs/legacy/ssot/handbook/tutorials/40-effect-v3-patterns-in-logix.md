---
title: Effect v3 教程 · Tag/Layer/Scope/错误通道在本仓的标准姿势（从 0 到 1）
status: draft
version: 1
---

# Effect v3 教程 · Tag/Layer/Scope/错误通道在本仓的标准姿势（从 0 到 1）

> **定位**：本文是给“会写 Effect，但不确定本仓约定”的开发者的标准教程：如何用 Tag/Layer/Scope/typed error 写出 **可组合、可测试、可诊断** 的 Logix 代码。  
> **裁决来源**：Effect 语义以 `effect` v3 类型/TS 编译器为准；仓库约定以 `docs/ssot/runtime/**`、`docs/ssot/platform/**` 与本仓源码为准（本文负责把它们收口成可执行范式）。

## 0. 最短阅读路径（10 分钟上手）

1. 读「1.1 三个泛型顺序」：确认 `Effect.Effect<A, E, R>` 的顺序不要写反。  
2. 读「2.1 Tag-only Service + Layer 注入」：掌握本仓最常用的 DI 方式。  
3. 读「2.3 Promise 集成：tryPromise vs promise」：避免把业务错误变 defect。  
4. 读「3.1/3.2」两个剧本：业务服务注入与测试替身注入。

补充阅读（上游裁决）：

- Tag-only Pattern：`docs/ssot/platform/foundation/glossary/03-assets-patterns.md`  
- 错误处理模型（SSoT）：`docs/ssot/runtime/logix-core/runtime/11-error-handling.md`

## 1. 心智模型（Effect 在本仓扮演什么角色）

### 1.1 三个泛型顺序：`Effect.Effect<A, E = never, R = never>`

本仓强约束认知（与 Effect v3 一致）：

- `A`：成功值  
- `E`：预期错误（typed error）  
- `R`：环境/依赖（services 的集合）

常见坑：把顺序写成 `Effect.Effect<R, E, A>`（会导致类型推导与 DI 全乱）。

### 1.2 Tag/Layer 是“依赖注入协议”，不是“全局单例”

推荐理解：

- `Tag`：服务契约（接口/能力插槽）  
- `Layer`：服务实现（如何提供该插槽）  
- `R`：当前程序需要哪些插槽（按需注入）

这让我们可以：

- 业务层只依赖抽象（DIP）；  
- 组合层注入真实实现或测试替身；  
- 避免把“胖 Env 对象”手动传来传去。

### 1.3 typed error vs defect：错误通道是合同的一部分

在本仓语境里：

- **预期错误**：用 `Effect.fail(E)` 或 `Effect.tryPromise` 映射到领域错误；应在局部捕获并转为状态/返回值。  
- **缺陷（defect）**：来自 `throw` / `die` / Promise reject（在 `Effect.promise` 中）等；会进入统一的缺陷上报链路。  

SSoT 见：`docs/ssot/runtime/logix-core/runtime/11-error-handling.md`。

## 2. 核心范式（从 0 到 1：怎么写、怎么注入、怎么用）

### 2.1 Tag-only Service（推荐）：只定义契约，不提供默认实现

本仓统一使用 Tag class 形态（不要新写 `Context.GenericTag`）：

- 参考实现：`packages/logix-core/src/ScopeRegistry.ts`、`packages/logix-core/src/internal/observability/runSession.ts` 等。

基本形态（示意）：

```ts
import { Context, Effect, Layer } from 'effect'

export interface FooService {
  readonly fetch: (id: string) => Effect.Effect<Foo, FooError, never>
}

export class Foo extends Context.Tag('@acme/Foo')<Foo, FooService>() {}

export const FooLive = Layer.succeed(Foo, { fetch: (id) => Effect.succeed({ id }) })
```

### 2.2 在业务逻辑里消费 Tag：`yield* Foo`（Effect.gen）

推荐写法（本仓约定）：

- `Effect.gen(function* () { const foo = yield* Foo; ... })`

避免：

- 手工构造/传递 `Context.Context`（胖 Env）；  
- 在业务层到处 `Effect.provideService`（应集中在组合层/RuntimeLayer）。

### 2.3 Promise 集成：`Effect.tryPromise` 用于业务错误；`Effect.promise` 的 reject 是 defect

约定（非常常见的坑）：

- `Effect.promise(...)` 的错误通道是 `never`；Promise reject 会变 defect（不走 typed error）。  
- 需要把 reject 映射到业务错误通道时，必须用 `Effect.tryPromise({ try, catch })`（或等价写法）。

### 2.4 超时/重试（v3）：对象参数 + pipe（不要用旧版三参）

建议写法（v3）：

- `effect.pipe(Effect.timeoutFail({ duration, onTimeout }))`  
- `effect.pipe(Effect.retry({ times: 3 }))`

不要写成旧版 `Effect.timeoutFail(effect, ...)` 或把 `Effect.retry` 当成会改变环境类型的操作。

### 2.5 Scope：资源必须可收束；长期任务必须有生命周期边界

最常见的两个场景：

- runtime boot/close：必须保证 fibers/资源在 scope close 时可收束（否则会触发 dispose timeout）。  
- 业务 side-effects：用 `Effect.acquireRelease`/`Scope` 管理资源，不要靠“全局单例 + 永不关闭”。

如果你遇到“常驻任务不会自然结束”的问题：先读 `docs/ssot/handbook/tutorials/02-runtime-lifecycle-and-scope.md`。

## 3. 剧本集（用例驱动）

### 3.1 剧本 A：业务服务注入（真实实现 vs 测试替身）

目标：业务逻辑只依赖 `Foo`（Tag），实现由组合根注入。

做法：

1. 定义 Tag-only service：`Foo extends Context.Tag(...)`。  
2. 业务逻辑里 `yield* Foo` 获取实现并调用。  
3. 在应用组合层（RuntimeLayer / 场景入口）注入：
   - 真实环境：`Layer.succeed(Foo, FooLiveImpl)`  
   - 测试环境：`Layer.succeed(Foo, FooTestStub)`

收益：

- 业务逻辑可复用、可测试；  
- 不需要在逻辑函数签名里传一堆依赖参数；  
- typed error 口径清晰（可在测试里断言错误分支）。

### 3.2 剧本 B：我把业务错误写成 throw，结果 Devtools 全是 defect 噪音

原因：

- `throw`/Promise reject 走 defect 通道，不是 typed error。  

修复：

- 在 IO 边界用 `Effect.tryPromise` 映射成领域错误 `E`；  
- 在局部 `catchTag/catchAll` 把 `E` 转为状态更新/返回值；  
- 让 defect 留给真正的 bug。

### 3.3 剧本 C：我在事务窗口里做了 IO（sleep/await），怎么把它改成正确的 Effect 组合

结论：事务窗口禁止 IO。正确做法是把 IO 拆到事务窗口外（multi-entry/pending→effect→writeback）。

详解见：`docs/ssot/handbook/tutorials/32-transaction-window-no-io.md`。

## 4. 代码锚点（Code Anchors）

1. `docs/ssot/runtime/logix-core/runtime/11-error-handling.md`：typed error/defect/装配失败/取消/诊断提示的分类。  
2. `docs/ssot/platform/foundation/glossary/03-assets-patterns.md`：Tag-only Pattern 的术语与定位。  
3. `packages/logix-core/src/ScopeRegistry.ts`：Tag/Layer 的典型定义与使用。  
4. `packages/logix-core/src/internal/observability/runSession.ts`：Tag 定义（RunSession）与 Effect.gen 消费模式。  
5. `packages/logix-core/src/internal/runtime/core/env.ts`：RuntimeStore/HostScheduler 等核心 Tag（环境注入点）。  

## 5. 验证方式（Evidence）

最小验证建议：

- 类型层：服务契约（Tag interface）与实现返回类型完全一致（含 `ReadonlyArray` vs `Array`）。  
- 错误语义：业务错误走 typed error（`E`），不要被 Promise reject 变成 defect。  
- 资源收束：新增资源/后台 fiber 必须能在 scope close 时正常释放（避免 dispose timeout）。

## 6. 常见坑（Anti-patterns）

- 把 `Effect.Effect` 泛型顺序写反。  
- 在业务层手动构造/传递 `Context.Context`（胖 Env）。  
- 用 `Effect.promise` 承载业务错误（reject 变 defect）。  
- 使用旧版 timeout/retry API 形态（与 v3 签名不一致）。  
- 把取消/interrupt 当错误上报（会让告警噪音飙升）。  
