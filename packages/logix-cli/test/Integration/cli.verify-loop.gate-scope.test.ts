import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { runCli } from '../../src/Commands.js'
import { getTxnPhasePolicy, withTxnIoGuard } from '../../src/internal/runtime/txnGuard.js'
import { extractGateScopeGateMap, loadVerifyLoopReportSchema } from '../helpers/verifyLoopSchema.js'

const getReport = (result: { readonly artifacts: ReadonlyArray<{ readonly outputKey: string; readonly inline?: unknown }> }): any =>
  result.artifacts.find((item) => item.outputKey === 'verifyLoopReport')?.inline

describe('logix-cli integration (verify-loop gateScope)', () => {
  it('keeps runtime/governance gate partitions stable and reflected in command output', async () => {
    const schema = await loadVerifyLoopReportSchema()
    const gateMap = extractGateScopeGateMap(schema)
    const runtimeOut = await Effect.runPromise(
      runCli(['verify-loop', '--runId', 'verify-scope-runtime', '--mode', 'run', '--target', 'fixture:pass']),
    )
    const governanceOut = await Effect.runPromise(
      runCli([
        'verify-loop',
        '--runId',
        'verify-scope-governance',
        '--mode',
        'run',
        '--gateScope',
        'governance',
        '--target',
        'fixture:pass',
      ]),
    )

    expect(gateMap.runtime).toEqual([
      'gate:type',
      'gate:lint',
      'gate:test',
      'gate:control-surface-artifact',
      'gate:diagnostics-protocol',
    ])
    expect(gateMap.governance).toEqual(['gate:perf-hard', 'gate:ssot-drift', 'gate:migration-forward-only'])

    expect(runtimeOut.kind).toBe('result')
    expect(governanceOut.kind).toBe('result')
    if (runtimeOut.kind !== 'result' || governanceOut.kind !== 'result') throw new Error('expected result')

    const runtimeReport = getReport(runtimeOut.result)
    const governanceReport = getReport(governanceOut.result)
    expect(runtimeReport.gateResults.every((item: any) => gateMap.runtime.includes(item.gate))).toBe(true)
    expect(governanceReport.gateResults.every((item: any) => gateMap.governance.includes(item.gate))).toBe(true)
  })

  it('allows IO in verify-loop gate-run phase', () => {
    const policy = getTxnPhasePolicy('verify-loop.gate-run')

    expect(policy).toEqual({ inTxn: false, allowIo: true })
    expect(withTxnIoGuard('verify-loop.gate-run', 'read', () => 'ok')).toBe('ok')
  })
})
