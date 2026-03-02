import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { runCli } from '../../src/Commands.js'
import { COMMAND_REGISTRY } from '../../src/internal/commandRegistry.js'
import { VERIFICATION_CHAIN_CATALOG_V1 } from '../../src/internal/contracts/verificationChains.js'
import { assertDescribeReportV1Schema, assertVerificationChainCatalogV1Schema } from '../../src/internal/protocol/schemaValidation.js'

describe('contracts 103 describe schema', () => {
  it('validates verification chain catalog contract', () => {
    expect(() => assertVerificationChainCatalogV1Schema(VERIFICATION_CHAIN_CATALOG_V1)).not.toThrow()

    const invalidCatalog = {
      ...VERIFICATION_CHAIN_CATALOG_V1,
      chains: [
        {
          ...VERIFICATION_CHAIN_CATALOG_V1.chains[0],
          commandSteps: [],
        },
      ],
    }
    expect(() => assertVerificationChainCatalogV1Schema(invalidCatalog)).toThrowError(/至少包含一个步骤/)
  })

  it('validates describe report contract and fails on broken guidance payload', async () => {
    const out = await Effect.runPromise(runCli(['describe', '--runId', 'describe-schema-contract-1', '--json']))
    expect(out.kind).toBe('result')
    if (out.kind !== 'result') throw new Error('expected result')
    expect(out.exitCode).toBe(0)

    const report = out.result.artifacts.find((artifact) => artifact.outputKey === 'describeReport')?.inline as any
    expect(() => assertDescribeReportV1Schema(report)).not.toThrow()

    const invalid = {
      ...report,
      agentGuidance: {
        ...report.agentGuidance,
        verificationChains: [
          {
            ...report.agentGuidance.verificationChains[0],
            expectedOutputKeys: [],
          },
        ],
      },
    }
    expect(() => assertDescribeReportV1Schema(invalid)).toThrowError(/expectedOutputKeys/)
  })

  it('keeps default artifact filename metadata complete for primary command outputs', () => {
    const primaryEntries = COMMAND_REGISTRY.filter((entry) => entry.visibility === 'primary')
    for (const entry of primaryEntries) {
      for (const output of entry.contract.outputs) {
        expect(typeof output.defaultArtifactFileName).toBe('string')
        expect((output.defaultArtifactFileName ?? '').length).toBeGreaterThan(0)
      }
    }
  })
})
