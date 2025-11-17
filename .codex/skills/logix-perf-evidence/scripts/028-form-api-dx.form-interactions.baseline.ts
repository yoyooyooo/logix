import { performance } from 'node:perf_hooks'
import { Effect, Schema } from 'effect'
import * as Logix from '@logix/core'
import * as Form from '@logix/form'

const now = () => performance.now()

const quantile = (sorted: ReadonlyArray<number>, q: number): number => {
  if (sorted.length === 0) return Number.NaN
  const clamped = Math.min(1, Math.max(0, q))
  const idx = Math.floor(clamped * (sorted.length - 1))
  return sorted[idx]!
}

const summarize = (
  samples: ReadonlyArray<number>,
): { readonly n: number; readonly p50Ms: number; readonly p95Ms: number } => {
  const sorted = samples.slice().sort((a, b) => a - b)
  return {
    n: sorted.length,
    p50Ms: quantile(sorted, 0.5),
    p95Ms: quantile(sorted, 0.95),
  }
}

type ScenarioResult = Readonly<{
  readonly runs: number
  readonly warmupDiscard: number
  readonly samplesMs: ReadonlyArray<number>
  readonly stats: { readonly n: number; readonly p50Ms: number; readonly p95Ms: number }
}>

const makeValuesSchema = () => {
  const ItemSchema = Schema.Struct({
    id: Schema.String,
    name: Schema.String,
    quantity: Schema.Number,
    price: Schema.Number,
  })

  return Schema.Struct({
    contact: Schema.Struct({
      email: Schema.String,
      phone: Schema.String,
    }),
    items: Schema.Array(ItemSchema),
  })
}

const makeInitialValues = (rows: number) => ({
  contact: {
    email: 'user@example.com',
    phone: '13800000000',
  },
  items: Array.from({ length: rows }, (_, i) => ({
    id: String(i + 1),
    name: `Item-${i + 1}`,
    quantity: 1,
    price: 10,
  })),
})

const main = async (): Promise<void> => {
  const RUNS = Number.parseInt(process.env.RUNS ?? '30', 10)
  const WARMUP_DISCARD = Number.parseInt(process.env.WARMUP_DISCARD ?? '5', 10)
  const ROWS = Number.parseInt(process.env.ROWS ?? '50', 10)

  const ValuesSchema = makeValuesSchema()
  const initialValues = makeInitialValues(ROWS)

  const M = Form.make('Perf028FormInteractions', {
    values: ValuesSchema,
    initialValues,
    validateOn: ['onChange', 'onBlur'],
    reValidateOn: ['onChange', 'onBlur'],
    debounceMs: 0,
    traits: Form.traits(ValuesSchema)({
      'contact.email': {
        check: Form.Rule.make({
          required: 'required',
          pattern: { value: /.+@.+\\..+/, message: 'invalid_email' },
        }),
      },
      items: {
        identityHint: { trackBy: 'id' },
        item: {
          check: {
            quantity: {
              deps: ['quantity'],
              validate: (row: any) =>
                typeof row?.quantity === 'number' && row.quantity >= 1 ? {} : { quantity: 'min_1' },
            },
            price: {
              deps: ['price'],
              validate: (row: any) => (typeof row?.price === 'number' && row.price >= 0 ? {} : { price: 'min_0' }),
            },
          },
        },
      },
    }),
  })

  const runtime = Logix.Runtime.make(M as any, { layer: Logix.Debug.noopLayer })

  const programSetValue = (value: string): Effect.Effect<void> =>
    Effect.gen(function* () {
      const rt = yield* M.tag
      yield* rt.dispatch({ _tag: 'setValue', payload: { path: 'contact.email', value } } as any)
    })

  const programBlur = (): Effect.Effect<void> =>
    Effect.gen(function* () {
      const rt = yield* M.tag
      yield* rt.dispatch({ _tag: 'blur', payload: { path: 'contact.email' } } as any)
    })

  const programSwap = (): Effect.Effect<void> =>
    Effect.gen(function* () {
      const rt = yield* M.tag
      yield* rt.dispatch({ _tag: 'arraySwap', payload: { path: 'items', indexA: 1, indexB: 2 } } as any)
    })

  const programMove = (): Effect.Effect<void> =>
    Effect.gen(function* () {
      const rt = yield* M.tag
      yield* rt.dispatch({ _tag: 'arrayMove', payload: { path: 'items', from: 1, to: 10 } } as any)
    })

  const programAppendRemove = (): Effect.Effect<void> =>
    Effect.gen(function* () {
      const rt = yield* M.tag
      const value = {
        id: 'tmp',
        name: 'Temp',
        quantity: 1,
        price: 0,
      }
      yield* rt.dispatch({ _tag: 'arrayAppend', payload: { path: 'items', value } } as any)
      yield* rt.dispatch({ _tag: 'arrayRemove', payload: { path: 'items', index: ROWS } } as any)
    })

  const programSubmit = (): Effect.Effect<void> =>
    Effect.gen(function* () {
      const rt = yield* M.tag
      const controller = (M as any).controller.make(rt as any)
      yield* controller.controller.handleSubmit({
        onValid: () => Effect.void,
        onInvalid: () => Effect.void,
      })
    })

  const runScenario = async (run: (iteration: number) => Effect.Effect<void>): Promise<ScenarioResult> => {
    const samples: number[] = []
    for (let i = 0; i < RUNS; i++) {
      const start = now()
      await runtime.runPromise(run(i) as any)
      const end = now()
      samples.push(end - start)
    }
    const trimmed = samples.slice(Math.min(WARMUP_DISCARD, samples.length))
    return {
      runs: RUNS,
      warmupDiscard: WARMUP_DISCARD,
      samplesMs: trimmed,
      stats: summarize(trimmed),
    }
  }

  const setValue = await runScenario((i) => programSetValue(i % 2 === 0 ? 'user+0@example.com' : 'user+1@example.com'))
  const blur = await runScenario(() => programBlur())
  const arrayAppendRemove = await runScenario(() => programAppendRemove())
  const arraySwap = await runScenario(() => programSwap())
  const arrayMove = await runScenario(() => programMove())
  const submit = await runScenario(() => programSubmit())

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        meta: {
          node: process.version,
          platform: `${process.platform}/${process.arch}`,
          runs: RUNS,
          warmupDiscard: WARMUP_DISCARD,
          rows: ROWS,
        },
        scenarios: {
          setValue,
          blur,
          array: {
            appendRemove: arrayAppendRemove,
            swap: arraySwap,
            move: arrayMove,
          },
          submit,
        },
      },
      null,
      2,
    ),
  )
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err)
  process.exitCode = 1
})
