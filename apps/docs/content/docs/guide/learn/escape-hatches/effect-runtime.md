---
title: '与 Effect Flow Runtime 协同'
description: 在前端 Logix 中触发服务侧 Flow 并管理状态反馈。
---

本指南说明如何在前端 Logix 中触发服务侧 Flow (Effect Flow Runtime) 并管理状态反馈。

## 1. 角色分工

- **Logix Engine**: 承载前端本地状态与交互逻辑。负责页面内的即时反馈和副作用编排。
- **Effect Flow Runtime**: 承载跨系统、需要持久化和审计的业务流程（如创建订单、审批流）。

从 Logix 的视角看，Effect Flow Runtime 只是一个通过 `Effect.Service` 暴露出来的、可被调用的远程服务。

## 2. 在 Logic 中触发 Flow

触发一个后端 Flow 的标准流程，与调用任何其他异步 API 完全相同，都遵循“Action -> Logic -> Service -> State Update”的模式。

### 步骤一：定义服务契约 (Service Contract)

使用 `Context.Tag` 定义一个 `FlowRunner` 服务，它封装了对后端 Flow 的调用。

```typescript
// a-flow-runner.service.ts
import { Context, Effect } from 'effect'

// 定义调用后端 Flow 的输入和输出类型
interface RunFlowInput {
  flowId: string
  input: any
}
interface RunFlowOutput {
  success: boolean
  data?: any
  error?: any
}

// 定义服务接口
class FlowRunner extends Context.Tag('FlowRunner')<
  FlowRunner,
  {
    readonly run: (input: RunFlowInput) => Effect.Effect<RunFlowOutput, Error, any>
  }
>() {}
```

### 步骤二：在 Logic 中调用服务

在 Logic 程序中，通过 `$.flow.fromAction` 监听触发事件，然后在 `$.flow.run` 中执行一个包含服务调用的 Effect。

```typescript
// a-feature.logic.ts
const featureLogic = Effect.gen(function* (_) {
  const submit$ = $.flow.fromAction((a) => a._tag === 'submit')

  const submitEffect = Effect.gen(function* (_) {
    const runner = yield* $.use(FlowRunner) // 从环境中获取服务
    const current = yield* $.state.read

    yield* $.state.mutate((draft) => {
      draft.meta.isSubmitting = true
    })

    // 调用后端 Flow
    const result = yield* Effect.either(runner.run({ flowId: 'createOrder', input: current.form }))

    // 根据成功或失败更新状态
    if (result._tag === 'Left') {
      yield* $.state.mutate((draft) => {
        draft.meta.isSubmitting = false
        draft.meta.error = result.left.message
      })
    } else {
      yield* $.state.mutate((draft) => {
        draft.meta.isSubmitting = false
        draft.data = result.right.data // 回填数据
      })
    }
  })

  // 使用 runExhaust 防止重复提交
  yield* submit$.pipe($.flow.runExhaust(submitEffect))
})
```

## 3. 最佳实践与反模式

### 推荐模式

- **服务封装**: 将所有与后端 Flow 的通信细节封装在专门的 `Effect.Service` 中，`Logic` 层只关心调用服务和更新状态。
- **状态驱动**: 使用 Logix 的 `State` 来统一管理 `isSubmitting`, `error` 等 UI 状态，而不是在 React 组件中用 `useState`。
- **声明式并发**: 利用 `runExhaust` (防重提交) 或 `runLatest` (取消旧请求) 等 `Flow` API 来声明式地管理并发。

### 避免模式

- **在 React 组件中直接调用**: 这会绕过 Logix 的状态管理和调试追踪体系，导致逻辑碎片化。
- **将 Flow 的运行状态保存在组件本地**: 所有与流程相关的状态都应由某个 Logix Module 管理，以保证数据流的单一和可预测。

通过这种方式，调用一个复杂的后端长流程，和调用一个简单的数据查询 API，对于前端 Logix 来说在架构上是完全同构的，都统一在 `Effect` 和 `Flow` 的模型之下。
