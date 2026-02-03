import { describe, it, expect } from 'vitest'

import { normalizeContractSuiteFacts } from '../../src/contract-suite/normalize.js'
import { computeContractSuiteVerdict } from '../../src/contract-suite/verdict.js'
import { PORT_SPEC_ARTIFACT_KEY, RULES_MANIFEST_ARTIFACT_KEY, TYPE_IR_ARTIFACT_KEY } from '../../src/contract-suite/normalize.js'

describe('contract-suite (036): diff determinism', () => {
  it('produces stable verdict JSON for the same inputs', () => {
    const input = {
      runId: 'r1',
      trialRunReport: {
        runId: 'r1',
        ok: true,
        artifacts: {
          [PORT_SPEC_ARTIFACT_KEY]: {
            artifactKey: PORT_SPEC_ARTIFACT_KEY,
            ok: true,
            value: {
              protocolVersion: 'v1',
              moduleId: 'M',
              actions: [{ key: 'a' }],
              events: [],
              outputs: [],
              exports: [],
            },
          },
          [TYPE_IR_ARTIFACT_KEY]: { artifactKey: TYPE_IR_ARTIFACT_KEY, ok: true, value: { protocolVersion: 'v1', moduleId: 'M', types: [] } },
          [RULES_MANIFEST_ARTIFACT_KEY]: { artifactKey: RULES_MANIFEST_ARTIFACT_KEY, ok: true, value: { manifest: {} } },
        },
      },
      before: {
        portSpec: {
          protocolVersion: 'v1',
          moduleId: 'M',
          actions: [{ key: 'removed' }, { key: 'a' }],
          events: [],
          outputs: [],
          exports: [],
        },
      },
    } as const

    const facts1 = normalizeContractSuiteFacts(input)
    const facts2 = normalizeContractSuiteFacts(input)

    const v1 = computeContractSuiteVerdict(facts1)
    const v2 = computeContractSuiteVerdict(facts2)

    expect(JSON.stringify(v1)).toBe(JSON.stringify(v2))
  })
})

