import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { readFileSync } from 'node:fs'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '../../../src/index.js'

const readJson = (url: URL): any => JSON.parse(readFileSync(url, 'utf8'))

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const assertMatchesSchema = (schemas: { readonly evidence: any; readonly policy: any }, value: unknown): void => {
  const resolveRef = (ref: unknown): any => {
    if (typeof ref !== 'string') {
      throw new Error(`invalid $ref: ${String(ref)}`)
    }
    if (ref === schemas.policy.$id) {
      return schemas.policy
    }
    throw new Error(`unsupported $ref: ${ref}`)
  }

  const validate = (schema: any, input: unknown, path: string): void => {
    if (schema && typeof schema === 'object' && typeof schema.$ref === 'string') {
      validate(resolveRef(schema.$ref), input, path)
      return
    }

    const type = schema?.type
    if (type === 'object') {
      if (!isRecord(input)) {
        throw new Error(`${path}: expected object`)
      }

      const props: Record<string, any> = isRecord(schema.properties) ? schema.properties : {}

      if (schema.additionalProperties === false) {
        const allowed = new Set(Object.keys(props))
        for (const key of Object.keys(input)) {
          if (!allowed.has(key)) {
            throw new Error(`${path}: unknown key "${key}"`)
          }
        }
      }

      const required: ReadonlyArray<string> = Array.isArray(schema.required) ? schema.required : []
      for (const key of required) {
        if (!(key in input)) {
          throw new Error(`${path}: missing required key "${key}"`)
        }
      }

      for (const [key, subSchema] of Object.entries(props)) {
        if (key in input) {
          validate(subSchema, (input as any)[key], `${path}.${key}`)
        }
      }
      return
    }

    if (type === 'array') {
      if (!Array.isArray(input)) {
        throw new Error(`${path}: expected array`)
      }
      if (typeof schema.minItems === 'number' && input.length < schema.minItems) {
        throw new Error(`${path}: expected minItems=${schema.minItems}`)
      }
      const itemSchema = schema.items
      for (let i = 0; i < input.length; i++) {
        validate(itemSchema, input[i], `${path}[${i}]`)
      }
      return
    }

    if (type === 'string') {
      if (typeof input !== 'string') {
        throw new Error(`${path}: expected string`)
      }
      if (typeof schema.minLength === 'number' && input.length < schema.minLength) {
        throw new Error(`${path}: expected minLength=${schema.minLength}`)
      }
      if (Array.isArray(schema.enum) && !schema.enum.includes(input)) {
        throw new Error(`${path}: expected enum=${schema.enum.join(',')}`)
      }
      return
    }

    if (type === 'boolean') {
      if (typeof input !== 'boolean') {
        throw new Error(`${path}: expected boolean`)
      }
      return
    }

    if (type === 'number' || type === 'integer') {
      if (typeof input !== 'number' || !Number.isFinite(input)) {
        throw new Error(`${path}: expected number`)
      }
      if (type === 'integer' && !Number.isInteger(input)) {
        throw new Error(`${path}: expected integer`)
      }
      if (typeof schema.minimum === 'number' && input < schema.minimum) {
        throw new Error(`${path}: expected minimum=${schema.minimum}`)
      }
      return
    }
  }

  validate(schemas.evidence, value, 'TxnLaneEvidence')
}

const computeValue = (a: number, offset: number): number => {
  let x = (a + offset) | 0
  for (let i = 0; i < 1200; i++) {
    x = (Math.imul(x, 1103515245) + 12345) | 0
  }
  return x
}

const waitUntil = (cond: Effect.Effect<boolean>): Effect.Effect<void> =>
  Effect.gen(function* () {
    while (!(yield* cond)) {
      yield* Effect.yieldNow()
    }
  })

const makeModule = (args: { readonly deferred: number }) => {
  const fields: Record<string, Schema.Schema.Any> = {
    a: Schema.Number,
    b: Schema.Number,
  }
  for (let i = 0; i < args.deferred; i++) {
    fields[`d${i}`] = Schema.Number
  }

  const State = Schema.Struct(fields) as any
  const Actions = { noop: Schema.Void }

  const traits: Record<string, any> = {}
  for (let i = 0; i < args.deferred; i++) {
    const key = `d${i}`
    traits[key] = Logix.StateTrait.computed({
      deps: ['a'] as any,
      get: (a: any) => computeValue(a, i),
      scheduling: 'deferred',
    } as any)
  }

  const M = Logix.Module.make('TxnLaneEvidence_Schema', {
    state: State as any,
    actions: Actions,
    reducers: { noop: (s: any) => s },
    traits: Logix.StateTrait.from(State as any)(traits as any),
  })

  const initial: Record<string, number> = {
    a: 0,
    b: 0,
  }
  for (let i = 0; i < args.deferred; i++) {
    initial[`d${i}`] = computeValue(0, i)
  }

  const impl = M.implement({
    initial: initial as any,
    logics: [],
  })

  return { M, impl }
}

describe('TxnLaneEvidence schema (060)', () => {
  it.scoped('emits TxnLaneEvidence that matches JSON schema when diagnostics is enabled', () =>
    Effect.gen(function* () {
      const schemas = {
        evidence: readJson(
          new URL(
            '../../../../../specs/060-react-priority-scheduling/contracts/schemas/txn-lane-evidence.schema.json',
            import.meta.url,
          ),
        ),
        policy: readJson(
          new URL(
            '../../../../../specs/060-react-priority-scheduling/contracts/schemas/txn-lane-policy.schema.json',
            import.meta.url,
          ),
        ),
      } as const

      const events: Array<Logix.Debug.Event> = []
      const sink: Logix.Debug.Sink = {
        record: (event: Logix.Debug.Event) =>
          Effect.sync(() => {
            events.push(event)
          }),
      }

      const layer = Layer.mergeAll(Logix.Debug.diagnosticsLevel('full'), Logix.Debug.replace([sink])) as Layer.Layer<
        any,
        never,
        never
      >

      const DEFERRED = 64
      const { M, impl } = makeModule({ deferred: DEFERRED })

      const runtime = Logix.Runtime.make(impl, {
        layer,
        stateTransaction: {
          traitConvergeMode: 'dirty',
          traitConvergeBudgetMs: 100_000,
          traitConvergeDecisionBudgetMs: 100_000,
          traitConvergeTimeSlicing: { enabled: true, debounceMs: 1, maxLagMs: 50 },
          txnLanes: { enabled: true, budgetMs: 0, debounceMs: 0, maxLagMs: 50, allowCoalesce: true },
        },
      })

      yield* Effect.promise(() =>
        runtime.runPromise(
          Effect.gen(function* () {
            const rt: any = yield* M.tag

            yield* Logix.InternalContracts.runWithStateTransaction(rt, { kind: 'test', name: 't1' }, () =>
              Effect.gen(function* () {
                const prev = yield* rt.getState
                yield* rt.setState({ ...prev, a: 1 })
                Logix.InternalContracts.recordStatePatch(rt, 'a', 'unknown')
              }),
            )

            const expectedD0 = computeValue(1, 0)
            const expectedLast = computeValue(1, DEFERRED - 1)
            const lastKey = `d${DEFERRED - 1}`

            yield* waitUntil(
              rt.getState.pipe(Effect.map((s: any) => s.d0 === expectedD0 && s[lastKey] === expectedLast)),
            )
          }),
        ),
      )

      const laneEvents = events.filter((e) => e.type === 'trace:txn-lane') as Array<any>
      expect(laneEvents.length).toBeGreaterThan(0)

      for (const e of laneEvents) {
        const evidence = e.data?.evidence
        expect(() => JSON.stringify(evidence)).not.toThrow()
        assertMatchesSchema(schemas, evidence)
        expect(evidence?.anchor?.txnSeq).toBe(e.txnSeq)
      }
    }),
  )

  it.scoped('does not emit TxnLaneEvidence when diagnostics is off', () =>
    Effect.gen(function* () {
      const events: Array<Logix.Debug.Event> = []
      const sink: Logix.Debug.Sink = {
        record: (event: Logix.Debug.Event) =>
          Effect.sync(() => {
            events.push(event)
          }),
      }

      const layer = Layer.mergeAll(Logix.Debug.diagnosticsLevel('off'), Logix.Debug.replace([sink])) as Layer.Layer<
        any,
        never,
        never
      >

      const DEFERRED = 32
      const { M, impl } = makeModule({ deferred: DEFERRED })

      const runtime = Logix.Runtime.make(impl, {
        layer,
        stateTransaction: {
          traitConvergeMode: 'dirty',
          traitConvergeBudgetMs: 100_000,
          traitConvergeDecisionBudgetMs: 100_000,
          traitConvergeTimeSlicing: { enabled: true, debounceMs: 1, maxLagMs: 50 },
          txnLanes: { enabled: true, budgetMs: 0, debounceMs: 0, maxLagMs: 50, allowCoalesce: true },
        },
      })

      yield* Effect.promise(() =>
        runtime.runPromise(
          Effect.gen(function* () {
            const rt: any = yield* M.tag

            yield* Logix.InternalContracts.runWithStateTransaction(rt, { kind: 'test', name: 't1' }, () =>
              Effect.gen(function* () {
                const prev = yield* rt.getState
                yield* rt.setState({ ...prev, a: 1 })
                Logix.InternalContracts.recordStatePatch(rt, 'a', 'unknown')
              }),
            )

            const expectedD0 = computeValue(1, 0)
            const expectedLast = computeValue(1, DEFERRED - 1)
            const lastKey = `d${DEFERRED - 1}`

            yield* waitUntil(
              rt.getState.pipe(Effect.map((s: any) => s.d0 === expectedD0 && s[lastKey] === expectedLast)),
            )
          }),
        ),
      )

      const laneEvents = events.filter((e) => e.type === 'trace:txn-lane')
      expect(laneEvents.length).toBe(0)
    }),
  )
})
