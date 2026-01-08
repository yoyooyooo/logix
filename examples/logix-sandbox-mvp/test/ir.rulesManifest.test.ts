import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Effect, Schema } from 'effect'
import * as Logix from '@logixjs/core'
import * as Form from '@logixjs/form'

describe('/ir: rulesManifest artifact', () => {
  it.effect('exports @logixjs/form.rulesManifest@v1 when module uses Form.rules', () =>
    Effect.gen(function* () {
      const Values = Schema.Struct({ name: Schema.String })
      const R = Form.rules(Values)
      const AppRoot = Form.make('IrTest.FormRules', {
        values: Values,
        initialValues: { name: '' },
        rules: R(R.field('name', { required: true })),
      })

      const report = yield* Logix.Observability.trialRunModule(AppRoot, {
        diagnosticsLevel: 'off',
        maxEvents: 0,
        trialRunTimeoutMs: 1000,
        closeScopeTimeout: 500,
      })

      expect(() => JSON.stringify(report)).not.toThrow()

      const artifacts: any = report.artifacts
      expect(artifacts).toBeDefined()
      const env = artifacts['@logixjs/form.rulesManifest@v1']
      expect(env.ok).toBe(true)
      expect(env.value?.manifest?.moduleId).toBe('IrTest.FormRules')
      expect(Array.isArray(env.value?.warnings)).toBe(true)
    }),
  )
})
