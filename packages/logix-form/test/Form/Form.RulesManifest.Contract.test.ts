import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '@logixjs/core'
import * as Form from '../../src/index.js'

const jsonUtf8Bytes = (value: unknown): number => new TextEncoder().encode(JSON.stringify(value)).length

const assertOnlyKeys = (value: unknown, allowed: ReadonlyArray<string>, label: string): void => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`[test] ${label} must be an object`)
  }
  const keys = Object.keys(value as any).sort()
  expect(keys).toEqual([...allowed].sort())
}

const assertKeysSubsetOf = (value: unknown, allowed: ReadonlyArray<string>, label: string): void => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`[test] ${label} must be an object`)
  }
  const keys = Object.keys(value as any)
  for (const k of keys) {
    expect(allowed.includes(k)).toBe(true)
  }
}

describe('Form RulesManifest contracts (028)', () => {
  it.scoped('serializable + stable memo + minimal shape', () =>
    Effect.gen(function* () {
      const ValuesSchema = Schema.Struct({
        name: Schema.String,
        items: Schema.Array(
          Schema.Struct({
            id: Schema.String,
            warehouseId: Schema.String,
          }),
        ),
      })

      type Values = Schema.Schema.Type<typeof ValuesSchema>

      const $ = Form.from(ValuesSchema)
      const z = $.rules

      const rules = z(
        Form.Rule.field('name', {
          required: 'required',
        }),
        Form.Rule.list('items', {
          identity: { mode: 'trackBy', trackBy: 'id' },
          item: {
            deps: ['warehouseId'],
            validate: (_row: any) => undefined,
          },
          list: {
            validate: (_rows: any) => undefined,
          },
        }),
      )

      const form = Form.make('Form.RulesManifest.Contract', {
        values: ValuesSchema,
        initialValues: {
          name: '',
          items: [],
        } satisfies Values,
        rules,
      })

      const Host = Logix.Module.make('Form.RulesManifest.Contract.Host', {
        state: Schema.Struct({ ok: Schema.Boolean }),
        actions: {},
      })

      const HostLogic = Host.logic(($0) =>
        Logix.Logic.of<typeof Host.shape, any, void, any>(
          Effect.gen(function* () {
            const handle = (yield* $0.use(form)) as any

            expect(typeof handle.rulesManifest).toBe('function')
            expect(typeof handle.rulesManifestWarnings).toBe('function')

            const m1 = handle.rulesManifest()
            const m2 = handle.rulesManifest()
            expect(m1).toBe(m2)

            expect(() => JSON.parse(JSON.stringify(m1))).not.toThrow()

            expect(typeof m1.moduleId).toBe('string')
            expect(m1.moduleId).toBe('Form.RulesManifest.Contract')
            expect(Array.isArray(m1.lists)).toBe(true)
            expect(Array.isArray(m1.rules)).toBe(true)

            for (const list of m1.lists as any[]) {
              assertOnlyKeys(list, ['identity', 'path'], 'manifest.lists[]')
              expect(Array.isArray(list.path)).toBe(true)
              for (const seg of list.path) expect(typeof seg).toBe('string')
              expect(typeof list.identity?.mode).toBe('string')
            }

            for (const rule of m1.rules as any[]) {
              assertKeysSubsetOf(rule, ['deps', 'meta', 'ruleId', 'scope', 'validateOn'], 'manifest.rules[]')
              expect(Object.keys(rule)).toEqual(expect.arrayContaining(['deps', 'meta', 'ruleId', 'scope']))
              expect(typeof rule.ruleId).toBe('string')
              expect(Array.isArray(rule.deps)).toBe(true)
              expect(typeof rule.scope?.kind).toBe('string')
              expect(Array.isArray(rule.scope?.fieldPath)).toBe(true)
              if (rule.validateOn !== undefined) {
                expect(Array.isArray(rule.validateOn)).toBe(true)
              }
            }

            const warnings1 = handle.rulesManifestWarnings()
            const warnings2 = handle.rulesManifestWarnings()
            expect(warnings1).toBe(warnings2)
            expect(() => JSON.parse(JSON.stringify(warnings1))).not.toThrow()
            expect(Array.isArray(warnings1)).toBe(true)

            // Size budget: avoid accidentally bringing heavy structures into the Static IR.
            expect(jsonUtf8Bytes(m1)).toBeLessThanOrEqual(50_000)

            yield* $0.state.mutate((draft) => {
              draft.ok = true
            })
          }),
        ),
      )

      const impl = Host.implement({
        initial: { ok: false },
        logics: [HostLogic],
        imports: [form.impl],
      })

      const runtime = Logix.Runtime.make(impl, {
        layer: Layer.empty as Layer.Layer<any, never, never>,
      })

      const program = Effect.gen(function* () {
        const hostRt = yield* Host.tag
        yield* Effect.sleep('20 millis')
        const state = yield* hostRt.getState
        expect(state.ok).toBe(true)
      })

      yield* Effect.promise(() => runtime.runPromise(program as any))
    }),
  )
})
