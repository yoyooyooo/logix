---
title: 表单向导
description: 使用 Logix 实现多步骤表单向导模式。
---

# 表单向导模式

多步骤表单（Wizard）是复杂表单场景的常见模式：将长表单拆分为多个步骤，每步独立校验，最终汇总提交。

## 核心思路

1. **状态结构**：`currentStep` + `steps[]` + 每步的 `values` 和 `errors`
2. **步骤导航**：`next` / `prev` / `goToStep` Actions
3. **校验时机**：每步离开前校验，提交前全量校验

## 状态设计

```ts
import * as Logix from '@logix/core'
import { Schema } from 'effect'

const WizardDef = Logix.Module.make('Wizard', {
  state: Schema.Struct({
    currentStep: Schema.Number,
    steps: Schema.Array(
      Schema.Struct({
        id: Schema.String,
        label: Schema.String,
        isValid: Schema.Boolean,
        isVisited: Schema.Boolean,
      }),
    ),
    // 各步骤的表单数据
    step1: Schema.Struct({ name: Schema.String, email: Schema.String }),
    step2: Schema.Struct({ address: Schema.String, city: Schema.String }),
    step3: Schema.Struct({ cardNumber: Schema.String }),
    // 全局状态
    isSubmitting: Schema.Boolean,
    submitError: Schema.NullOr(Schema.String),
  }),
  actions: {
    next: Schema.Void,
    prev: Schema.Void,
    goToStep: Schema.Number,
    updateStep1: Schema.partial(Schema.Struct({ name: Schema.String, email: Schema.String })),
    updateStep2: Schema.partial(Schema.Struct({ address: Schema.String, city: Schema.String })),
    updateStep3: Schema.partial(Schema.Struct({ cardNumber: Schema.String })),
    submit: Schema.Void,
  },
})
```

## 步骤导航逻辑

```ts
const WizardLogic = WizardDef.logic(($) =>
  Effect.gen(function* () {
    // 下一步：先校验当前步骤
    yield* $.onAction('next').run(() =>
      Effect.gen(function* () {
        const state = yield* $.state.read
        const currentStep = state.currentStep

        // 校验当前步骤
        const isValid = yield* validateStep(currentStep, state)
        if (!isValid) return

        // 标记当前步骤有效，进入下一步
        yield* $.state.mutate((d) => {
          d.steps[currentStep].isValid = true
          if (currentStep < d.steps.length - 1) {
            d.currentStep = currentStep + 1
            d.steps[currentStep + 1].isVisited = true
          }
        })
      }),
    )

    // 上一步：无需校验
    yield* $.onAction('prev').run(() =>
      $.state.mutate((d) => {
        if (d.currentStep > 0) {
          d.currentStep = d.currentStep - 1
        }
      }),
    )

    // 跳转到指定步骤（只能跳到已访问的步骤）
    yield* $.onAction('goToStep').run((step) =>
      $.state.mutate((d) => {
        if (step >= 0 && step < d.steps.length && d.steps[step].isVisited) {
          d.currentStep = step
        }
      }),
    )
  }),
)
```

## 提交逻辑

```ts
yield*
  $.onAction('submit').runExhaust(() =>
    Effect.gen(function* () {
      const api = yield* $.use(WizardApi)
      const state = yield* $.state.read

      // 1. 全量校验
      for (let i = 0; i < state.steps.length; i++) {
        const isValid = yield* validateStep(i, state)
        if (!isValid) {
          yield* $.state.mutate((d) => {
            d.currentStep = i
          })
          return
        }
      }

      // 2. 提交
      yield* $.state.mutate((d) => {
        d.isSubmitting = true
      })

      yield* api
        .submit({
          ...state.step1,
          ...state.step2,
          ...state.step3,
        })
        .pipe(
          Effect.tap(() =>
            $.state.mutate((d) => {
              d.isSubmitting = false
            }),
          ),
          Effect.catchAll((error) =>
            $.state.mutate((d) => {
              d.isSubmitting = false
              d.submitError = error.message
            }),
          ),
        )
    }),
  )
```

## React 组件

```tsx
function Wizard() {
  const wizard = useModule(WizardModule)
  const { currentStep, steps, isSubmitting } = useSelector(wizard, (s) => s)
  const dispatch = useDispatch(wizard)

  return (
    <div className="wizard">
      {/* 步骤指示器 */}
      <StepIndicator
        steps={steps}
        current={currentStep}
        onStepClick={(i) => dispatch({ _tag: 'goToStep', payload: i })}
      />

      {/* 当前步骤内容 */}
      {currentStep === 0 && <Step1Form />}
      {currentStep === 1 && <Step2Form />}
      {currentStep === 2 && <Step3Form />}

      {/* 导航按钮 */}
      <div className="wizard-nav">
        {currentStep > 0 && <button onClick={() => dispatch({ _tag: 'prev' })}>上一步</button>}
        {currentStep < steps.length - 1 ? (
          <button onClick={() => dispatch({ _tag: 'next' })}>下一步</button>
        ) : (
          <button onClick={() => dispatch({ _tag: 'submit' })} disabled={isSubmitting}>
            {isSubmitting ? '提交中...' : '提交'}
          </button>
        )}
      </div>
    </div>
  )
}
```

## 使用 @logix/form 的增强版

如果每个步骤的表单较复杂，可以结合 `@logix/form`：

```ts
// 为每个步骤创建独立的 Form
const Step1Form = Form.make({
  values: { name: '', email: '' },
  // ... validation rules
})

// 在 Wizard 中组合
const WizardModule = WizardDef.implement({
  imports: [Step1Form, Step2Form, Step3Form],
  // ...
})
```

## 相关模式

- [校验与错误](../../form/validation)
- [分页加载](./pagination)
