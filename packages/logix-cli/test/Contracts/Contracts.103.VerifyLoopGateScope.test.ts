import { describe, expect, it } from 'vitest'

import { extractGateScopeGateMap, loadVerifyLoopReportSchema } from '../helpers/verifyLoopSchema.js'

describe('contracts 103 verify-loop gateScope partition', () => {
  it('binds runtime/governance to fixed gate sets', async () => {
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
})
