import { describe, it, expect } from '@effect/vitest'
import { readFileSync } from 'node:fs'

const readJson = (url: URL): any => JSON.parse(readFileSync(url, 'utf8'))

describe('StateTrait ConvergeAuto contracts shape', () => {
  it('guards trait-converge-data schema drift (required/additionalProperties/enums)', () => {
    const schema = readJson(
      new URL(
        '../../../../specs/013-auto-converge-planner/contracts/schemas/trait-converge-data.schema.json',
        import.meta.url,
      ),
    )

    expect(schema.additionalProperties).toBe(false)

    const required = new Set<string>(schema.required ?? [])
    expect(required.has('configScope')).toBe(true)
    expect(required.has('requestedMode')).toBe(true)
    expect(required.has('executedMode')).toBe(true)
    expect(required.has('outcome')).toBe(true)
    expect(required.has('staticIrDigest')).toBe(true)
    expect(required.has('executionBudgetMs')).toBe(true)
    expect(required.has('executionDurationMs')).toBe(true)
    expect(required.has('reasons')).toBe(true)
    expect(required.has('stepStats')).toBe(true)

    const configScopeEnum = schema?.properties?.configScope?.enum
    expect(configScopeEnum).toEqual(['provider', 'runtime_module', 'runtime_default', 'builtin'])

    const reasonsEnum = schema?.properties?.reasons?.items?.enum
    expect(reasonsEnum).toEqual([
      'cold_start',
      'cache_hit',
      'cache_miss',
      'budget_cutoff',
      'near_full',
      'unknown_write',
      'dirty_all',
      'generation_bumped',
      'low_hit_rate_protection',
      'module_override',
      'time_slicing_immediate',
      'time_slicing_deferred',
    ])
  })
})
