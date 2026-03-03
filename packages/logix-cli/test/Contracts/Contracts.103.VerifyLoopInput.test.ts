import { describe, expect, it } from 'vitest'

import { extractModeRequiredFields, loadVerifyLoopInputSchema, requiredFieldSet, rootAdditionalPropertiesStrict } from '../helpers/verifyLoopSchema.js'
import { makeVerifyLoopInputFixture } from '../helpers/verifyLoopSchema.js'
import { assertVerifyLoopInputV1Schema } from '../../src/internal/protocol/schemaValidation.js'

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

  it('keeps runtime validator equivalent to verify-loop.input required strategy', () => {
    const runInput = makeVerifyLoopInputFixture({ mode: 'run' })
    const resumeInput = makeVerifyLoopInputFixture({ mode: 'resume' })

    expect(() => assertVerifyLoopInputV1Schema(runInput)).not.toThrow()
    expect(() => assertVerifyLoopInputV1Schema(resumeInput)).not.toThrow()

    const invalidResumeMissingInstance = { ...resumeInput }
    delete (invalidResumeMissingInstance as { instanceId?: string }).instanceId
    expect(() => assertVerifyLoopInputV1Schema(invalidResumeMissingInstance)).toThrowError(/instanceId/)

    const invalidRunMissingRunId = { ...runInput }
    delete (invalidRunMissingRunId as { runId?: string }).runId
    expect(() => assertVerifyLoopInputV1Schema(invalidRunMissingRunId)).toThrowError(/runId/)
  })
})
