---
title: 常见问题排查
description: Logix 诊断代码解释与常见错误修复指南。
---

# 常见问题排查

本页收集 Logix Runtime 在运行时可能发出的诊断代码、常见错误场景及修复方法。

### 适合谁

- 遇到 Logix 相关报错或警告，想快速定位原因；
- 在 DevTools 中看到 `diagnostic` 事件，想了解具体含义。

### 前置知识

- 已阅读「Modules & State」和「Flows & Effects」，了解 Module / Logic 的基本结构。

### 读完你将获得

- 能够根据诊断代码快速定位问题根因；
- 知道如何修复最常见的 setup/run 阶段错误。

---

## 诊断代码速查表

| 代码                           | 严重级别 | 含义                    | 修复方向                     |
| ------------------------------ | -------- | ----------------------- | ---------------------------- |
| `logic::invalid_phase`         | error    | setup/run 阶段 API 混用 | 调整调用位置到正确阶段       |
| `logic::env_service_not_found` | warning  | Env Service 尚未就绪（常见启动噪音） | 检查 Layer 提供顺序          |
| `assembly::missing_module_runtime` | error | imports/作用域缺失导致 strict 解析失败 | 补齐 `imports` 或提升为 root 单例 |
| `reducer::late_registration`   | warning  | Reducer 注册过晚        | 将 `$.reducer` 移到 setup 段 |
| `state_transaction::dirty_all_fallback` | warning | 缺少字段级 dirty-set 证据 | 用 `immerReducers` / `$.state.mutate` / `Logix.Module.Reducer.mutate`（ModuleTag 场景用 `ModuleTag.Reducer.mutate`）提供可追踪 patchPaths |
| `state_transaction::async_escape` | error | 同步事务窗口内出现异步逃逸 | 不要在同步写入体内 `await/sleep/IO`；改用 `run*Task` 或拆成多次入口写回 |
| `state_transaction::enqueue_in_transaction` | error | 同步事务窗口内 dispatch/setState | 不要在同步写入体内触发 dispatch；拆成多次入口或移到事务外 |
| `logic::invalid_usage`         | error    | 同步事务内调用 `run*Task` | 不要在 reducer/`IntentBuilder.update/mutate` 的同步 body 内调用 `run*Task` |

---

## 常见错误场景

### 1. LogicPhaseError: `$.lifecycle.*` 在 run 段调用

**症状**：

```
[LogicPhaseError] $.lifecycle.onInit is not allowed in run phase (kind=lifecycle_in_run).
```

**诊断代码**：`logic::invalid_phase`

**原因**：`$.lifecycle.onInit`、`$.lifecycle.onDestroy` 等生命周期注册 API 是 **setup-only**，只能在 Logic 的 setup 段（`return` 之前）调用，不能在 `Effect.gen` 内部调用。

**错误写法**：

```ts
const Logic = Module.logic(($) =>
  Effect.gen(function* () {
    // ❌ 这里是 run 段，不能注册生命周期
    $.lifecycle.onInit(Effect.log('init'))

    yield* $.onAction('foo').run(/* ... */)
  }),
)
```

**正确写法**：

```ts
const Logic = Module.logic(($) => {
  // ✅ setup 段：return 之前
  $.lifecycle.onInit(Effect.log('init'))

  return Effect.gen(function* () {
    // run 段：正常写 watcher
    yield* $.onAction('foo').run(/* ... */)
  })
})
```

---

### 2. LogicPhaseError: `$.use` 在 setup 段调用

**症状**：

```
[LogicPhaseError] $.use is not allowed in setup phase (kind=use_in_setup).
```

**诊断代码**：`logic::invalid_phase`

**原因**：`$.use(Service)` 需要从运行时环境获取依赖，只能在 run 段（`Effect.gen` 内部）调用。

**错误写法**：

```ts
const Logic = Module.logic(($) => {
  // ❌ setup 段不能访问 Env
  const api = $.use(ApiService)

  return Effect.gen(function* () {
    /* ... */
  })
})
```

**正确写法**：

```ts
const Logic = Module.logic(($) =>
  Effect.gen(function* () {
    // ✅ run 段：可以 yield* $.use
    const api = yield* $.use(ApiService)
    // ...
  }),
)
```

---

### 3. MissingModuleRuntimeError: imports 缺失

**症状**：

```
MissingModuleRuntimeError: Module 'Child' is not available in imports.
```

**原因**：在 Logic 中通过 `$.use(ChildModule)` 访问子模块，但 `implement` 时未在 `imports` 中提供该模块。

**错误写法**：

```ts
const HostModule = HostDef.implement({
  initial: {
    /* ... */
  },
  logics: [HostLogic],
  // ❌ 缺少 imports
})
```

**正确写法**：

```ts
const HostModule = HostDef.implement({
  initial: {
    /* ... */
  },
  logics: [HostLogic],
  imports: [ChildImpl], // ✅ 提供子模块实现
})
```

---

### 4. Reducer 注册过晚

**症状**：

- 派发 Action 后，Primary Reducer 未执行；
- DevTools 中看到 `reducer::late_registration` 警告。

**诊断代码**：`reducer::late_registration`

**原因**：`$.reducer(tag, fn)` 必须在 setup 段调用，在 run 段注册的 Reducer 不会被 Runtime 执行。

**错误写法**：

```ts
const Logic = Module.logic(($) =>
  Effect.gen(function* () {
    // ❌ run 段注册 reducer，不会生效
    $.reducer('increment', (s) => ({ ...s, count: s.count + 1 }))
  }),
)
```

**正确写法**：

```ts
const Logic = Module.logic(($) => {
  // ✅ setup 段注册 reducer
  $.reducer('increment', (s) => ({ ...s, count: s.count + 1 }))

  return Effect.gen(function* () {
    /* ... */
  })
})
```

> 更推荐的做法：把 Primary Reducer 直接写在 `Logix.Module.make` 的 `reducers` 字段中。

---

### 5. Traits 在 run 段声明

**症状**：

```
[LogicPhaseError] $.traits.declare is not allowed in run phase (kind=traits_declare_in_run).
```

**诊断代码**：`logic::invalid_phase`

**原因**：`$.traits.declare(...)` 是 setup-only API，traits 在 setup 结束后会被冻结。

**正确写法**：

```ts
const Logic = Module.logic(($) => ({
  setup: Effect.sync(() => {
    // ✅ setup 段声明 traits
    $.traits.declare({
      /* ... */
    })
  }),
  run: Effect.void,
}))
```

---

### 6. Service not found 初始化噪音

**症状**：

- 应用启动时看到 `Service not found: ...` 警告；
- 后续状态和功能正常。

**诊断代码**：`logic::env_service_not_found`

**原因**：Logic 在初始化阶段尝试访问尚未完全铺设的 Env Service，这在某些初始化时序下是已知的一次性噪音。

**处理方式**：

- 若只在启动时出现一次，且后续功能正常，可暂时忽略；
- 若持续出现，检查 `Runtime.make` / `RuntimeProvider.layer` 是否正确提供了对应 Service。

---

### 7. dispatch/setState 在同步事务窗口内调用

**症状**：

```
enqueueTransaction is not allowed inside a synchronous StateTransaction body
```

**诊断代码**：`state_transaction::enqueue_in_transaction`

**原因**：你在同步事务窗口内触发了 dispatch/setState（例如把 `$.dispatch/$.dispatchers/*` 写进了 `IntentBuilder.update/mutate` 的同步写入体，或其它“事务内运行”的同步 body）。这可能导致死锁或违反 backpressure 约束，因此运行时会直接失败。

**错误写法（示例）**：

```ts
// ❌ 不要在 update/mutate 的同步写入体里触发 dispatch
yield* $.onAction('save').update((prev) =>
  Effect.gen(function* () {
    yield* $.dispatchers.trackSave() // 事务内 dispatch
    return { ...prev, saved: true }
  }),
)
```

**正确写法（思路）**：

- 把 dispatch 移到事务外：先在 handler 里做 dispatch/IO，再用 `$.state.mutate` 写回；
- 或使用 multi-entry：`pending → IO → writeback`（推荐：`run*Task`）。

---

### 8. `run*Task` 在同步事务窗口内调用

**诊断代码**：`logic::invalid_usage`

**原因**：`run*Task` 会触发「pending → IO → writeback」的多入口执行模型；如果在同步事务窗口内调用，可能死锁 txnQueue，因此运行时会 no-op 并给出诊断。

**修复**：只在 watcher 的 run 段调用 `run*Task`（例如 `$.onAction/$.onState/$.on(...).runLatestTask(...)`），不要把它写进 reducer/`IntentBuilder.update/mutate` 的同步 body。

---

## DevTools 诊断事件

在启用 DevTools（`devtools: true`）后，所有诊断事件都会出现在时间线中，类型为 `diagnostic`。

典型事件结构：

```ts
{
  type: 'diagnostic',
  moduleId: 'Counter',
  code: 'logic::invalid_phase',
  severity: 'error',
  message: '$.lifecycle.onInit is not allowed in run phase.',
  hint: 'run 段禁止注册 $.lifecycle.*（setup-only）。请将生命周期注册移动到 Module.logic builder 的同步部分（return 之前）。',
  kind: 'lifecycle_in_run'
}
```

- `code`：诊断代码（用于速查表定位）
- `severity`：`error` / `warning` / `info`
- `hint`：修复建议

---

## 下一步

- 学习如何使用 DevTools 观察模块行为：[调试与 DevTools](./debugging-and-devtools)
- 了解错误处理策略：[错误处理](./error-handling)
- 查看测试相关指南：[测试](./testing)
