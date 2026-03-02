import { describe, expect, it } from 'vitest'

import { extractModeRequiredFields, loadVerifyLoopInputSchema, requiredFieldSet, rootAdditionalPropertiesStrict } from '../helpers/verifyLoopSchema.js'

describe('contracts 103 verify-loop input schema', () => {
  it('keeps root input schema strict and deterministic', async () => {
    const schema = await loadVerifyLoopInputSchema()
    const required = requiredFieldSet(schema)

    expect(rootAdditionalPropertiesStrict(schema)).toBe(true)
    expect(required.has('schemaVersion')).toBe(true)
    expect(required.has('kind')).toBe(true)
    expect(required.has('mode')).toBe(true)
    expect(required.has('instanceId')).toBe(true)
    expect(required.has('target')).toBe(true)
  })

  it('separates run/resume required fields', async () => {
    const schema = await loadVerifyLoopInputSchema()
    const modeRequired = extractModeRequiredFields(schema)

    expect(modeRequired.run).toEqual(['runId'])
    expect(modeRequired.resume).toEqual(['runId', 'previousRunId'])
  })

  it('locks mode to run/resume only', async () => {
    const schema = await loadVerifyLoopInputSchema()
    const modeEnum = schema.properties?.mode?.enum

    expect(modeEnum).toEqual(['run', 'resume'])
  })
})
