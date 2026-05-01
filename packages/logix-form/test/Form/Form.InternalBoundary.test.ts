import { readFileSync } from 'node:fs'
import { describe, expect, it } from '@effect/vitest'
import { Effect, Schema } from 'effect'
import * as Form from '../../src/index.js'

describe('Form internal boundary', () => {
  it('does not depend on legacy FieldRuntime family or legacy setup-run shape', () => {
    const installSource = readFileSync(new URL('../../src/internal/form/install.ts', import.meta.url), 'utf8')
    const commandsSource = readFileSync(new URL('../../src/internal/form/commands.ts', import.meta.url), 'utf8')

    expect(installSource).not.toMatch(/return\s+\{\s*setup\s*,\s*run\s*\}/)
    expect(installSource).not.toMatch(/FieldRuntime/)
    expect(commandsSource).not.toMatch(/FieldRuntime/)
  })

  it('pins explicit semantic-owner guards around implementation-first enablers', () => {
    const installSource = readFileSync(new URL('../../src/internal/form/install.ts', import.meta.url), 'utf8')
    const implSource = readFileSync(new URL('../../src/internal/form/impl.ts', import.meta.url), 'utf8')

    expect(installSource).toMatch(/semantic-owner boundary/i)
    expect(installSource).toMatch(/field\(path\)\.source\(\.\.\.\) exact act stays in Form/i)
    expect(implSource).toMatch(/semantic-owner boundary/i)
    expect(implSource).toMatch(/define\(form\) remains the declaration and semantic owner/i)
  })

  it.effect('keeps companion field-only and does not open list/root companion surfaces', () =>
    Effect.gen(function* () {
      const Values = Schema.Struct({
        countryId: Schema.String,
        items: Schema.Array(
          Schema.Struct({
            id: Schema.String,
            warehouseId: Schema.String,
          }),
        ),
      })

      let fieldApi: any
      let listApi: any
      let rootApi: any

      Form.make(
        'Form.InternalBoundary.Companion',
        {
          values: Values,
          initialValues: {
            countryId: 'CN',
            items: [],
          },
        },
        (define: any) => {
          fieldApi = define.field('items.warehouseId')
          listApi = {
            list: define.list,
          }
          rootApi = {
            root: define.root,
          }
        },
      )

      expect(typeof fieldApi.companion).toBe('function')
      expect((listApi as any).companion).toBeUndefined()
      expect((rootApi as any).companion).toBeUndefined()
    }),
  )
})
