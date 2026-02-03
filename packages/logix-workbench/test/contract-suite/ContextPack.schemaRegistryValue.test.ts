import { describe, expect, it } from 'vitest'

import { computeContractSuiteVerdict, makeContractSuiteContextPack, normalizeContractSuiteFacts } from '../../src/index.js'

describe('ContractSuiteContextPack', () => {
  it('includes @logixjs/schema.registry@v1 value by default (whitelist)', () => {
    const trialRunReport = {
      runId: 'r1',
      ok: true,
      artifacts: {
        '@logixjs/schema.registry@v1': {
          artifactKey: '@logixjs/schema.registry@v1',
          ok: true,
          value: {
            protocolVersion: 'v1',
            effectVersion: '3.19.13',
            schemas: [],
          },
        },
      },
    }

    const facts = normalizeContractSuiteFacts({ runId: 'r1', trialRunReport })
    const verdict = computeContractSuiteVerdict(facts)

    const pack = makeContractSuiteContextPack({ facts, verdict })
    const schemaRegistry = (pack.facts.artifacts ?? []).find((a: any) => a.artifactKey === '@logixjs/schema.registry@v1')

    expect(schemaRegistry?.status).toBe('PRESENT')
    expect(schemaRegistry?.value?.protocolVersion).toBe('v1')
  })

  it('omits non-verdict artifact values when not whitelisted', () => {
    const trialRunReport = {
      runId: 'r1',
      ok: true,
      artifacts: {
        '@logixjs/schema.registry@v1': {
          artifactKey: '@logixjs/schema.registry@v1',
          ok: true,
          value: {
            protocolVersion: 'v1',
            effectVersion: '3.19.13',
            schemas: [],
          },
        },
      },
    }

    const facts = normalizeContractSuiteFacts({ runId: 'r1', trialRunReport })
    const verdict = computeContractSuiteVerdict(facts)

    const pack = makeContractSuiteContextPack({
      facts,
      verdict,
      options: {
        includeArtifactValuesFor: [],
      },
    })

    const schemaRegistry = (pack.facts.artifacts ?? []).find((a: any) => a.artifactKey === '@logixjs/schema.registry@v1')
    expect(schemaRegistry?.status).toBe('PRESENT')
    expect('value' in (schemaRegistry ?? {})).toBe(false)
  })
})

