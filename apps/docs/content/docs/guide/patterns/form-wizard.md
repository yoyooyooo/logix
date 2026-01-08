---
title: Form wizard
description: Implement a multi-step form wizard pattern with Logix.
---

# Form wizard pattern

Multi-step forms (wizards) are common for complex form flows: split a long form into steps, validate each step independently, and finally submit the aggregated result.

## Core idea

1. **State shape**: `currentStep` + `steps[]` + per-step `values` and `errors`
2. **Navigation**: `next` / `prev` / `goToStep` Actions
3. **Validation timing**: validate before leaving each step; validate everything before submit

## State design

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
    // Step form data
    step1: Schema.Struct({ name: Schema.String, email: Schema.String }),
    step2: Schema.Struct({ address: Schema.String, city: Schema.String }),
    step3: Schema.Struct({ cardNumber: Schema.String }),
    // Global state
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

## Navigation logic

```ts
const WizardLogic = WizardDef.logic(($) =>
  Effect.gen(function* () {
    // Next: validate current step first
    yield* $.onAction('next').run(() =>
      Effect.gen(function* () {
        const state = yield* $.state.read
        const currentStep = state.currentStep

        // Validate current step
        const isValid = yield* validateStep(currentStep, state)
        if (!isValid) return

        // Mark current step valid and go next
        yield* $.state.mutate((d) => {
          d.steps[currentStep].isValid = true
          if (currentStep < d.steps.length - 1) {
            d.currentStep = currentStep + 1
            d.steps[currentStep + 1].isVisited = true
          }
        })
      }),
    )

    // Prev: no validation needed
    yield* $.onAction('prev').run(() =>
      $.state.mutate((d) => {
        if (d.currentStep > 0) {
          d.currentStep = d.currentStep - 1
        }
      }),
    )

    // Jump to a step (only visited steps are allowed)
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

## Submit logic

```ts
yield*
  $.onAction('submit').runExhaust(() =>
    Effect.gen(function* () {
      const api = yield* $.use(WizardApi)
      const state = yield* $.state.read

      // 1) Validate all steps
      for (let i = 0; i < state.steps.length; i++) {
        const isValid = yield* validateStep(i, state)
        if (!isValid) {
          yield* $.state.mutate((d) => {
            d.currentStep = i
          })
          return
        }
      }

      // 2) Submit
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

## React component

```tsx
function Wizard() {
  const wizard = useModule(WizardModule)
  const { currentStep, steps, isSubmitting } = useSelector(wizard, (s) => s)
  const dispatch = useDispatch(wizard)

  return (
    <div className="wizard">
      {/* Step indicator */}
      <StepIndicator
        steps={steps}
        current={currentStep}
        onStepClick={(i) => dispatch({ _tag: 'goToStep', payload: i })}
      />

      {/* Current step content */}
      {currentStep === 0 && <Step1Form />}
      {currentStep === 1 && <Step2Form />}
      {currentStep === 2 && <Step3Form />}

      {/* Navigation buttons */}
      <div className="wizard-nav">
        {currentStep > 0 && <button onClick={() => dispatch({ _tag: 'prev' })}>Back</button>}
        {currentStep < steps.length - 1 ? (
          <button onClick={() => dispatch({ _tag: 'next' })}>Next</button>
        ) : (
          <button onClick={() => dispatch({ _tag: 'submit' })} disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </button>
        )}
      </div>
    </div>
  )
}
```

## Enhanced version with `@logix/form`

If each step’s form is complex, you can combine with `@logix/form`:

```ts
// Create a dedicated Form for each step
const Step1Form = Form.make({
  values: { name: '', email: '' },
  // ... validation rules
})

// Compose in Wizard
const WizardModule = WizardDef.implement({
  imports: [Step1Form, Step2Form, Step3Form],
  // ...
})
```

## Related patterns

- [Validation and errors](../../form/validation)
- [Pagination loading](./pagination)
