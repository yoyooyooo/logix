import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Effect, Schema } from 'effect'
import * as Logix from '@logixjs/core'
import * as Form from '@logixjs/form'
import { trialRunModule } from '../../../packages/logix-core/src/internal/observability/trialRunModule.js'

describe('/ir: rulesManifest artifact', () => {
  it.effect('exports @logixjs/form.rulesManifest@v1 when module uses the schema-scoped rules DSL', () =>
    Effect.gen(function* () {
      const Values = Schema.Struct({ name: Schema.String })
      const $ = Form.from(Values)
      const R = $.rules
      const AppRoot = Form.make('IrTest.FormRules', {
        values: Values,
        initialValues: { name: '' },
        logic: $.logic({
          rules: R(R.field('name', { required: true })),
        }),
      })

      const report = yield* trialRunModule(AppRoot as any, {
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
