---
title: 'Logix v3: The Sugar Roadmap (Metaprogramming Possibilities)'
status: superseded
layer: Vision
related:
  - logix-reactive-module-integration.md
superseded_by: ../L5/dsl-evolution-roadmap.md
priority: 900
---

# Logix v3: The Sugar Roadmap

基于 **"Schema Metadata (蓝图) + Runtime Capabilities (执行力)"** 的元编程模式，我们可以在以下领域创造出极具表现力的语法糖。

## 1. 持久化与同步 (Persistence & Sync)

利用 Schema 标记字段的持久化策略，Runtime 自动挂载读写逻辑。

*   **`Schema.LocalStorage(Key)`**:
    *   **蓝图**: 标记字段需要同步到 LocalStorage。
    *   **运行时**:
        *   Init: 从 LS 读取初始值。
        *   Watch: 监听字段变化 -> Debounce -> 写入 LS。
    *   **DX**: `theme: Schema.String.pipe(Schema.LocalStorage('app-theme'))`

*   **`Schema.UrlSync(ParamName)`**:
    *   **蓝图**: 标记字段与 URL Query Param 双向绑定。
    *   **运行时**:
        *   Init: 从 URL 解析初始值。
        *   Watch: 字段变 -> `history.replaceState`。
        *   Listen: `popstate` -> 更新字段。
    *   **DX**: `search: Schema.String.pipe(Schema.UrlSync('q'))`

## 2. 历史记录 (History / Undo-Redo)

*   **`Schema.TrackHistory`**:
    *   **蓝图**: 标记该字段（或整个 State）需要支持撤销重做。
    *   **运行时**: 自动维护一个 `HistoryStack` (Past/Future)，并暴露 `undo()` / `redo()` Action。
    *   **DX**: `canvas: CanvasSchema.pipe(Schema.TrackHistory)`

## 3. 网络交互 (Network & Optimistic UI)

*   **`Schema.Optimistic(MutationFn)`**:
    *   **蓝图**: 标记一个 Action Payload 或 State Update 为"乐观的"。
    *   **运行时**:
        1.  立即应用变更到 UI State。
        2.  后台执行 `MutationFn`。
        3.  失败 -> 自动回滚 (Rollback) 到快照。
    *   **DX**: `likeCount: Schema.Number.pipe(Schema.Optimistic(api.like))`

*   **`Schema.Polling(Interval)`**:
    *   **蓝图**: 标记一个 `Schema.Loadable` 需要轮询。
    *   **运行时**: 自动挂载定时器，定期触发 reload。

## 4. 验证与约束 (Validation & Constraints)

*   **`Schema.AsyncValidate(ValidatorFn)`**:
    *   **蓝图**: 标记字段需要异步校验（如用户名唯一性检查）。
    *   **运行时**:
        *   监听输入 -> Debounce -> 执行校验。
        *   将结果写入 `field.error`。
        *   校验中设置 `field.validating`。

*   **`Schema.CrossValidate(OtherField, Rule)`**:
    *   **蓝图**: 定义跨字段约束（如 `confirmPassword` 必须等于 `password`）。
    *   **运行时**: 监听两个字段的变化，自动触发校验。

## 5. 埋点与分析 (Analytics)

*   **`Schema.TrackChange(EventName)`**:
    *   **蓝图**: 标记当该字段变化时，需要上报埋点。
    *   **运行时**: 监听变化 -> 过滤(去重/采样) -> 调用 Analytics Service。
    *   **DX**: `tabIndex: Schema.Number.pipe(Schema.TrackChange('tab_switch'))`

## 6. 权限控制 (Access Control)

*   **`Schema.Guard(Permission)`**:
    *   **蓝图**: 标记该字段（或 Action）需要特定权限才能访问/执行。
    *   **运行时**:
        *   Action: 拦截 dispatch，无权限则抛错或忽略。
        *   State: 读取时脱敏 (Masking) 或返回空。
    *   **DX**: `salary: Schema.Number.pipe(Schema.Guard('admin'))`

## 7. 超越 Schema: 全链路元编程 (Beyond Schema)

"元编程模式" 不仅仅局限于 Schema。只要能挂载元数据的地方，都可以创造语法糖。

### 7.1 Action 语法糖 (Action Decorators)

利用高阶函数或配置对象，为 Action 附加行为。

*   **`Action.Debounce(300)`**:
    *   **蓝图**: 标记该 Action 需要防抖。
    *   **运行时**: 自动拦截 dispatch，应用防抖策略。
*   **`Action.Retry(3)`**:
    *   **蓝图**: 标记该 Action 失败后自动重试。
*   **`Action.Log(Format)`**:
    *   **蓝图**: 自动打印日志。

### 7.2 Logic 语法糖 (Logic Enhancers)

*   **`Logic.RunOnce`**:
    *   **蓝图**: 标记该 Logic 在 Module 生命周期内只运行一次（如初始化）。
*   **`Logic.OnBackground`**:
    *   **蓝图**: 标记该 Logic 在 Web Worker 或后台线程运行。

### 7.3 Module 语法糖 (Module Config)

*   **`Module.Meta({ persist: true })`**:
    *   **蓝图**: 整个 Module 的状态自动持久化。

## 8. 总结

Logix v3 的元编程是全方位的：
*   **Data**: Schema Annotations
*   **Behavior**: Action Decorators
*   **Flow**: Logic Enhancers

它们共同构成了一个 **"可配置的运行时 (Configurable Runtime)"**。

### 7.4 实现机制: Annotatable 接口 (The Mechanism)

为了支持上述能力，我们将 `Module` 和 `Logic` 设计为实现了 `Annotatable` 接口的对象（类似 Effect 的设计）。

**1. Module Metadata**
```ts
// 方式 A: Config 内置 (推荐)
Logix.Module('User', {
  meta: { persist: true, role: 'admin' },
  state: ...
})

// 方式 B: Pipe 扩展
Logix.Module('User', { ... }).pipe(
  Module.annotate({ author: 'Yoyo' })
)
```

**2. Logic Metadata**
```ts
UserModule.logic(($) => ...).pipe(
  Logic.annotate({
    runOnce: true,
    debounce: 300
  })
)
```

Runtime 在加载 Module/Logic 时，会优先读取这些 Metadata，并据此调整执行策略（如自动包裹 Debounce Middleware）。

## 9. 原则与边界: 防止滥用 (Principles & Boundaries)

"元编程模式" 是一把双刃剑。为了防止 Logix 变成一个充斥着"黑魔法"的框架，我们必须坚守以下原则：

### 9.1 适用范围 (Scope)
只有 **"跨业务通用的横切关注点 (Cross-Cutting Concerns)"** 才适合做成语法糖。
*   ✅ **适合**: 持久化、日志、权限、防抖、重试、Undo/Redo。
*   ❌ **不适合**: 具体的业务逻辑（如 "订单金额大于 100 则打折"）。业务逻辑应显式写在 Logic 中。

### 9.2 显式优于隐式 (Explicit over Implicit)
副作用应当尽可能显式化，避免在看似无害的地方隐藏重型逻辑。
*   ✅ **Good**: `Schema.Loadable` (明确声明这是一个异步容器)。
*   ❌ **Bad**: `Schema.String.pipe(Schema.AutoFetch('/api/user'))` (在一个普通字符串定义里隐藏了网络请求，极易误导)。

### 9.3 可逃逸原则 (Escape Hatch)
语法糖永远只是 **"捷径"**，而不是 **"唯一路径"**。
Runtime 必须保证：任何可以通过 Annotation 实现的功能，都一定可以通过手写 Logic 实现。当语法糖无法满足复杂需求时，开发者应能平滑地退回到显式编程模式。

## 10. 总结

Logix v3 的元编程是全方位的：
*   **Data**: Schema Annotations (定义数据的形状与能力)
*   **Behavior**: Action Decorators (定义行为的策略)
*   **Flow**: Logic Enhancers (定义流程的生命周期与上下文)

它们共同构成了一个 **"可配置的运行时 (Configurable Runtime)"**。通过在 **"原则与边界"** 内合理使用这些能力，我们可以在保持代码清晰可维护的同时，获得极致的开发体验 (DX)。
