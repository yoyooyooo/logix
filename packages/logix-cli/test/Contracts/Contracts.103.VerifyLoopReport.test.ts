import { describe, expect, it } from 'vitest'

import {
  extractGateScopeGateMap,
  extractModeRequiredFields,
  extractVerdictExitCodeMap,
  loadVerifyLoopReportSchema,
  nestedAdditionalPropertiesStrict,
  requiredFieldSet,
  rootAdditionalPropertiesStrict,
} from '../helpers/verifyLoopSchema.js'

describe('contracts 103 verify-loop report schema', () => {
  it('keeps report schema strict and required fields complete', async () => {
    const schema = await loadVerifyLoopReportSchema()
    const required = requiredFieldSet(schema)
    const gateResultRequired = new Set(schema.$defs?.gateResultItem?.required as ReadonlyArray<string> | undefined)
    const nextActionEnum = schema.$defs?.nextActionItem?.properties?.action?.enum

    expect(rootAdditionalPropertiesStrict(schema)).toBe(true)
    expect(nestedAdditionalPropertiesStrict(schema, 'gateResultItem')).toBe(true)
    expect(nestedAdditionalPropertiesStrict(schema, 'reasonItem')).toBe(true)
    expect(nestedAdditionalPropertiesStrict(schema, 'trajectoryItem')).toBe(true)
    expect(nestedAdditionalPropertiesStrict(schema, 'artifactItem')).toBe(true)
    expect(nestedAdditionalPropertiesStrict(schema, 'nextActionItem')).toBe(true)

    for (const field of [
      'runId',
      'instanceId',
      'mode',
      'gateScope',
      'txnSeq',
      'opSeq',
      'attemptSeq',
      'verdict',
      'exitCode',
      'gateResults',
      'reasonCode',
      'reasons',
      'trajectory',
      'nextActions',
      'artifacts',
    ]) {
      expect(required.has(field)).toBe(true)
    }

    expect(gateResultRequired.has('command')).toBe(true)
    expect(gateResultRequired.has('exitCode')).toBe(true)
    expect(nextActionEnum).toEqual(['run-command', 'rerun', 'inspect', 'stop'])
  })

  it('enforces stable verdict to exitCode contract', async () => {
    const schema = await loadVerifyLoopReportSchema()
    const mapping = extractVerdictExitCodeMap(schema)

    expect(mapping).toEqual({
      PASS: 0,
      ERROR: 1,
      VIOLATION: 2,
      RETRYABLE: 3,
      NOT_IMPLEMENTED: 4,
      NO_PROGRESS: 5,
    })
  })

  it('enforces gateScope partition for runtime/governance gates', async () => {
    const schema = await loadVerifyLoopReportSchema()
    const gateMap = extractGateScopeGateMap(schema)

    expect(gateMap.runtime).toEqual([
      'gate:type',
      'gate:lint',
      'gate:test',
      'gate:control-surface-artifact',
      'gate:diagnostics-protocol',
    ])
    expect(gateMap.governance).toEqual(['gate:perf-hard', 'gate:ssot-drift', 'gate:migration-forward-only'])
  })

  it('requires previousRunId for resume mode', async () => {
    const schema = await loadVerifyLoopReportSchema()
    const modeRequired = extractModeRequiredFields(schema)
    const resumeRule = (schema.allOf as ReadonlyArray<any> | undefined)?.find(
      (entry) => entry?.if?.properties?.mode?.const === 'resume',
    )

    expect(modeRequired.resume).toContain('previousRunId')
    expect(modeRequired.run).not.toContain('previousRunId')
    expect(resumeRule?.then?.properties?.trajectory?.minItems).toBe(2)
  })
})
